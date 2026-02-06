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
SSH_KEY_PATH="./your-key.pem"  # Path to your SSH key

# EC2 Instance IPs - Replace with your actual EC2 public IPs
BACKEND_HOST="YOUR_BACKEND_EC2_IP"
AI_MATCHING_HOST="YOUR_AI_MATCHING_EC2_IP"
FRONTEND_HOST="YOUR_FRONTEND_EC2_IP"

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

scp_upload() {
    local source=$1
    local host=$2
    local dest=$3
    scp -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=no -r "$source" "$SSH_USER@$host:$dest"
}

#-------------------------------------------------------------------------------
# Deploy Backend
#-------------------------------------------------------------------------------
deploy_backend() {
    log_step "Deploying Backend to $BACKEND_HOST..."

    # Upload project files
    log_info "Uploading PythonProject..."
    scp_upload "$PROJECT_DIR/PythonProject" "$BACKEND_HOST" "/home/ubuntu/"
    scp_upload "$PROJECT_DIR/deploy" "$BACKEND_HOST" "/home/ubuntu/"

    # Run setup script
    log_info "Running setup script..."
    ssh_cmd "$BACKEND_HOST" "chmod +x /home/ubuntu/deploy/setup_backend.sh && sudo /home/ubuntu/deploy/setup_backend.sh"

    log_info "✅ Backend deployment complete!"
}

#-------------------------------------------------------------------------------
# Deploy AI Matching
#-------------------------------------------------------------------------------
deploy_ai_matching() {
    log_step "Deploying AI Matching to $AI_MATCHING_HOST..."

    # Upload project files
    log_info "Uploading ai_matching..."
    scp_upload "$PROJECT_DIR/ai_matching" "$AI_MATCHING_HOST" "/home/ubuntu/"
    scp_upload "$PROJECT_DIR/deploy" "$AI_MATCHING_HOST" "/home/ubuntu/"

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

    # Create .env file with correct API URLs
    log_info "Creating frontend .env with API URLs..."
    cat > "$PROJECT_DIR/frontend/.env" << EOF
VITE_API_URL=http://$BACKEND_HOST:8000
VITE_AI_MATCHING_URL=http://$AI_MATCHING_HOST:8001
VITE_APP_NAME=Praktiki
VITE_APP_VERSION=1.0.0
EOF

    # Upload project files (excluding node_modules)
    log_info "Uploading frontend..."
    rsync -avz -e "ssh -i $SSH_KEY_PATH -o StrictHostKeyChecking=no" \
        --exclude 'node_modules' \
        --exclude 'dist' \
        "$PROJECT_DIR/frontend/" "$SSH_USER@$FRONTEND_HOST:/home/ubuntu/frontend/"
    scp_upload "$PROJECT_DIR/deploy" "$FRONTEND_HOST" "/home/ubuntu/"

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
    echo "Checking Frontend..."
    if curl -s --connect-timeout 5 "http://$FRONTEND_HOST/" > /dev/null; then
        log_info "✅ Frontend is responding"
    else
        log_warn "⚠️ Frontend not responding"
    fi
}

#-------------------------------------------------------------------------------
# Main
#-------------------------------------------------------------------------------
main() {
    validate_config

    echo ""
    echo "This script will deploy to:"
    echo "  Backend:     $BACKEND_HOST"
    echo "  AI Matching: $AI_MATCHING_HOST"
    echo "  Frontend:    $FRONTEND_HOST"
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
    echo "  Backend API:     http://$BACKEND_HOST:8000"
    echo "  AI Matching API: http://$AI_MATCHING_HOST:8001"
    echo "  Frontend:        http://$FRONTEND_HOST"
    echo ""
    echo "API Documentation:"
    echo "  Backend Swagger:     http://$BACKEND_HOST:8000/docs"
    echo "  AI Matching Swagger: http://$AI_MATCHING_HOST:8001/docs"
    echo ""
    echo "⚠️  NEXT STEPS:"
    echo "  1. Update Backend .env with production database credentials"
    echo "  2. Configure domains and SSL certificates"
    echo "  3. Set up monitoring and logging"
    echo ""
}

# Run if not sourced
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
