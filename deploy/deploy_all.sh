#!/bin/bash
#===============================================================================
# Praktiki - Master Deployment Script
# Deploys all three services to separate EC2 instances
#===============================================================================

set -e

echo "=========================================="
echo "  Praktiki Complete Deployment"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
    echo -e "\n${BLUE}===> $1${NC}\n"
}

#-------------------------------------------------------------------------------
# Configuration - UPDATE THESE VALUES
#-------------------------------------------------------------------------------
SSH_KEY_PATH="/c/Users/karti/computer_science/praktiki/prakritii.pem"  # Path to your SSH key

# EC2 Instance IPs - Replace with your actual EC2 public IPs
BACKEND_HOST="44.205.136.199"
AI_MATCHING_HOST="52.205.225.84"
FRONTEND_HOST="44.197.97.159"

SSH_USER="ubuntu"

# Project directories (relative to script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

#-------------------------------------------------------------------------------
# Validation
#-------------------------------------------------------------------------------
validate_config() {
    log_step "Validating configuration..."

    if [ ! -f "$SSH_KEY_PATH" ]; then
        log_error "SSH key not found at: $SSH_KEY_PATH"
        log_error "Please update SSH_KEY_PATH in this script."
        exit 1
    fi

    if [[ "$BACKEND_HOST" == "YOUR_"* ]]; then
        log_error "Please update EC2 IP addresses in this script!"
        log_error "Edit deploy_all.sh and set:"
        log_error "  - BACKEND_HOST"
        log_error "  - AI_MATCHING_HOST"
        log_error "  - FRONTEND_HOST"
        exit 1
    fi

    log_info "Configuration validated."
}

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------
ssh_cmd() {
    local host=$1
    shift
    ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$SSH_USER@$host" "$@"
}

# Upload a directory to EC2 via tar+ssh (works on Windows Git Bash, no rsync needed)
# Usage: tar_upload <source_dir> <host> <remote_dest> [exclude1] [exclude2] ...
tar_upload() {
    local source_dir=$1
    local host=$2
    local remote_dest=$3
    shift 3
    local excludes=()
    for pattern in "$@"; do
        excludes+=(--exclude "$pattern")
    done

    # Create remote directory
    ssh_cmd "$host" "mkdir -p $remote_dest"

    # Tar locally (with exclusions) and extract remotely via SSH pipe
    tar czf - -C "$(dirname "$source_dir")" "${excludes[@]}" "$(basename "$source_dir")" | \
        ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no "$SSH_USER@$host" "tar xzf - -C $(dirname "$remote_dest")"
}

#-------------------------------------------------------------------------------
# Deploy Backend
#-------------------------------------------------------------------------------
deploy_backend() {
    log_step "Deploying Backend to $BACKEND_HOST..."

    # Upload Praktiki backend (excluding venv, caches, and other unnecessary files)
    log_info "Uploading PythonProject..."
    tar_upload "$PROJECT_DIR/PythonProject" "$BACKEND_HOST" "/home/ubuntu/PythonProject" \
        'venv' '__pycache__' '*.pyc' '.git' '.env' '*.db' '*.sqlite3' \
        'secure_uploads' 'resume_parser'

    # Upload ABC-Portal backend
    log_info "Uploading ABC-Portal..."
    tar_upload "$PROJECT_DIR/ABC-Portal" "$BACKEND_HOST" "/home/ubuntu/ABC-Portal" \
        'venv' '__pycache__' '*.pyc' '.git' '.env' '*.db' '*.sqlite3' \
        'frontend/node_modules' 'frontend/dist' 'legacy_backup' 'sql_app.db'

    log_info "Uploading deploy scripts..."
    tar_upload "$PROJECT_DIR/deploy" "$BACKEND_HOST" "/home/ubuntu/deploy"

    # Run setup script
    log_info "Running setup script..."
    ssh_cmd "$BACKEND_HOST" "chmod +x /home/ubuntu/deploy/setup_backend.sh && sudo /home/ubuntu/deploy/setup_backend.sh"

    # Configure backend to use dedicated parser microservice on AI host
    log_info "Configuring backend parser service URL..."
    ssh_cmd "$BACKEND_HOST" "if [ -f /home/ubuntu/PythonProject/.env ]; then \
        if grep -q '^PARSER_SERVICE_URL=' /home/ubuntu/PythonProject/.env; then \
            sed -i 's|^PARSER_SERVICE_URL=.*|PARSER_SERVICE_URL=http://$AI_MATCHING_HOST:8002|' /home/ubuntu/PythonProject/.env; \
        else \
            printf '\nPARSER_SERVICE_URL=http://$AI_MATCHING_HOST:8002\nPARSER_SERVICE_TIMEOUT_SECONDS=45\n' >> /home/ubuntu/PythonProject/.env; \
        fi; \
    fi"
    ssh_cmd "$BACKEND_HOST" "sudo systemctl restart praktiki-backend || true"

    log_info "✅ Backend deployment complete!"
}

#-------------------------------------------------------------------------------
# Deploy AI Matching
#-------------------------------------------------------------------------------
deploy_ai_matching() {
    log_step "Deploying AI Matching to $AI_MATCHING_HOST..."

    # Upload project files (excluding venv, model cache, caches, and other unnecessary files)
    log_info "Uploading ai_matching..."
    tar_upload "$PROJECT_DIR/ai_matching" "$AI_MATCHING_HOST" "/home/ubuntu/ai_matching" \
        'venv' '__pycache__' '*.pyc' '.git' '.env' 'model_cache' '.cache' '*.pt' '*.bin'

    log_info "Uploading deploy scripts..."
    tar_upload "$PROJECT_DIR/deploy" "$AI_MATCHING_HOST" "/home/ubuntu/deploy"

    # Run setup script
    log_info "Running setup script (this will take longer due to ML dependencies)..."
    ssh_cmd "$AI_MATCHING_HOST" "chmod +x /home/ubuntu/deploy/setup_ai_matching.sh && sudo /home/ubuntu/deploy/setup_ai_matching.sh"

    log_info "✅ AI Matching deployment complete!"
}

#-------------------------------------------------------------------------------
# Deploy Frontend
#-------------------------------------------------------------------------------
deploy_frontend() {
    log_step "Deploying Frontend to $FRONTEND_HOST..."

    # Create Praktiki frontend .env with correct API URLs
    log_info "Creating Praktiki frontend .env with API URLs..."
    cat > "$PROJECT_DIR/frontend/.env" << EOF
VITE_API_URL=http://$BACKEND_HOST:8000
VITE_AI_MATCHING_URL=http://$AI_MATCHING_HOST:8001
VITE_APP_NAME=Praktiki
VITE_APP_VERSION=1.0.0
EOF

    # Clean old frontend directories on EC2 (preserve .env files)
    # Must use sudo because previous setup_*.sh ran as root and created root-owned files
    log_info "Cleaning stale frontend files on EC2..."
    ssh_cmd "$FRONTEND_HOST" "sudo rm -rf /home/ubuntu/frontend && mkdir -p /home/ubuntu/frontend"
    ssh_cmd "$FRONTEND_HOST" "sudo rm -rf /home/ubuntu/abc-frontend"

    # Upload Praktiki frontend (excluding node_modules, dist, .git)
    log_info "Uploading Praktiki frontend..."
    tar_upload "$PROJECT_DIR/frontend" "$FRONTEND_HOST" "/home/ubuntu/frontend" \
        'node_modules' 'dist' '.git'

    # Upload ABC-Portal frontend
    log_info "Uploading ABC-Portal frontend..."
    tar_upload "$PROJECT_DIR/ABC-Portal/frontend" "$FRONTEND_HOST" "/home/ubuntu/abc-frontend" \
        'node_modules' 'dist' '.git'

    log_info "Uploading deploy scripts..."
    tar_upload "$PROJECT_DIR/deploy" "$FRONTEND_HOST" "/home/ubuntu/deploy"

    # Run setup script
    log_info "Running setup script..."
    ssh_cmd "$FRONTEND_HOST" "chmod +x /home/ubuntu/deploy/setup_frontend.sh && sudo /home/ubuntu/deploy/setup_frontend.sh"

    log_info "✅ Frontend deployment complete!"
}

#-------------------------------------------------------------------------------
# Health Checks
#-------------------------------------------------------------------------------
health_check() {
    log_step "Running health checks..."

    echo ""
    echo "Checking Backend..."
    if curl -s --connect-timeout 5 "http://$BACKEND_HOST:8000/" > /dev/null; then
        log_info "✅ Backend API is responding"
    else
        log_warn "⚠️ Backend API not responding (may still be starting)"
    fi

    echo ""
    echo "Checking AI Matching..."
    if curl -s --connect-timeout 10 "http://$AI_MATCHING_HOST:8001/" > /dev/null; then
        log_info "✅ AI Matching API is responding"
    else
        log_warn "⚠️ AI Matching API not responding (ML models may still be loading)"
    fi

    echo ""
    echo "Checking Resume Parser..."
    if curl -s --connect-timeout 10 "http://$AI_MATCHING_HOST:8002/" > /dev/null; then
        log_info "✅ Resume Parser API is responding"
    else
        log_warn "⚠️ Resume Parser API not responding (may still be starting)"
    fi

    echo ""
    echo "Checking ABC Backend..."
    if curl -s --connect-timeout 5 "http://$BACKEND_HOST:8003/" > /dev/null; then
        log_info "✅ ABC Portal Backend is responding"
    else
        log_warn "⚠️ ABC Portal Backend not responding (may still be starting)"
    fi

    echo ""
    echo "Checking Praktiki Frontend..."
    if curl -s --connect-timeout 5 "http://$FRONTEND_HOST/" > /dev/null; then
        log_info "✅ Praktiki Frontend is responding"
    else
        log_warn "⚠️ Praktiki Frontend not responding"
    fi

    echo ""
    echo "Checking ABC Frontend..."
    if curl -s --connect-timeout 5 "http://$FRONTEND_HOST:3000/" > /dev/null; then
        log_info "✅ ABC Portal Frontend is responding"
    else
        log_warn "⚠️ ABC Portal Frontend not responding"
    fi
}

#-------------------------------------------------------------------------------
# Main
#-------------------------------------------------------------------------------
main() {
    validate_config

    echo ""
    echo "This script will deploy to:"
    echo "  Backend + ABC Backend:  $BACKEND_HOST"
    echo "  AI Matching:            $AI_MATCHING_HOST"
    echo "  Frontend + ABC Frontend: $FRONTEND_HOST"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi

    # Deploy each service
    deploy_backend
    deploy_ai_matching
    deploy_frontend

    # Health checks
    health_check

    echo ""
    echo "=========================================="
    echo "  Deployment Complete!"
    echo "=========================================="
    echo ""
    echo "Service URLs:"
    echo "  Praktiki Backend:  http://$BACKEND_HOST:8000"
    echo "  ABC Portal Backend: http://$BACKEND_HOST:8003"
    echo "  AI Matching API:   http://$AI_MATCHING_HOST:8001"
    echo "  Resume Parser:     http://$AI_MATCHING_HOST:8002"
    echo "  Praktiki Frontend: http://$FRONTEND_HOST"
    echo "  ABC Portal Frontend: http://$FRONTEND_HOST:3000"
    echo ""
    echo "API Documentation:"
    echo "  Praktiki Swagger:      http://$BACKEND_HOST:8000/docs"
    echo "  ABC Portal Swagger:    http://$BACKEND_HOST:8003/docs"
    echo "  AI Matching Swagger:   http://$AI_MATCHING_HOST:8001/docs"
    echo "  Resume Parser Swagger: http://$AI_MATCHING_HOST:8002/docs"
    echo ""
    echo "⚠️  NEXT STEPS:"
    echo "  1. Update Backend .env files with production database credentials"
    echo "  2. Configure domains and SSL certificates"
    echo "  3. Set up monitoring and logging"
    echo "  4. Add ports 8003 and 3000 to EC2 security groups"
    echo ""
}

# Run if not sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
