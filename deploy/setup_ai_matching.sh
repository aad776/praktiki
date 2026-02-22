#!/bin/bash
#===============================================================================
# Praktiki AI Matching Service - EC2 Setup Script
# FastAPI service with ML models (sentence-transformers, torch)
#===============================================================================

set -e  # Exit on error

echo "=========================================="
echo "  Praktiki AI Matching Setup Script"
echo "=========================================="

# Configuration
APP_DIR="/home/ubuntu/ai_matching"
VENV_DIR="$APP_DIR/venv"
SERVICE_NAME="praktiki-ai-matching"
APP_PORT=8001
APP_USER="ubuntu"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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
    echo -e "\n${GREEN}===> $1${NC}\n"
}

#-------------------------------------------------------------------------------
# Step 1: System Update & Dependencies
#-------------------------------------------------------------------------------
log_info "Updating system packages..."
apt-get update -y
apt-get upgrade -y

log_info "Installing Python and required system dependencies..."
apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    build-essential \
    nginx \
    supervisor \
    git \
    curl \
    htop

#-------------------------------------------------------------------------------
# Step 2: Increase Swap Space (for ML models)
#-------------------------------------------------------------------------------
log_info "Configuring swap space for ML model loading..."

# Check if swap already exists
if [ $(swapon --show | wc -l) -eq 0 ]; then
    log_info "Creating 4GB swap file..."
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    log_info "Swap file created and enabled."
else
    log_info "Swap already configured."
fi

#-------------------------------------------------------------------------------
# Step 3: Create Python Virtual Environment
#-------------------------------------------------------------------------------
log_info "Setting up Python virtual environment..."

if [ ! -d "$APP_DIR" ]; then
    log_error "Application directory $APP_DIR not found!"
    log_error "Please upload ai_matching folder to /home/ubuntu/ first."
    exit 1
fi

cd "$APP_DIR"

# Create virtual environment
python3 -m venv "$VENV_DIR"

# Activate and install dependencies
source "$VENV_DIR/bin/activate"
pip install --upgrade pip

log_info "Installing ML dependencies (this may take several minutes)..."
pip install -r requirements.txt
pip install gunicorn  # Production WSGI server

#-------------------------------------------------------------------------------
# Step 4: Pre-download ML Models
#-------------------------------------------------------------------------------
log_info "Pre-downloading ML models to avoid startup delays..."

python3 << 'EOF'
from sentence_transformers import SentenceTransformer
print("Downloading sentence-transformers model...")
model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model downloaded successfully!")
EOF

#-------------------------------------------------------------------------------
# Step 5: Environment Configuration
#-------------------------------------------------------------------------------
log_info "Checking environment configuration..."

if [ ! -f "$APP_DIR/.env" ]; then
    log_warn ".env file not found! Creating from template..."
    cat > "$APP_DIR/.env" << 'EOF'
# AI Matching Service Configuration
BACKEND_API_URL=http://localhost:8000
MODEL_CACHE_DIR=/home/ubuntu/ai_matching/model_cache
DEBUG=false
EOF
    log_warn "Please update .env file with production values!"
fi

# Create model cache directory
mkdir -p "$APP_DIR/model_cache"
chown -R $APP_USER:$APP_USER "$APP_DIR/model_cache"

#-------------------------------------------------------------------------------
# Step 6: Create Systemd Service
#-------------------------------------------------------------------------------
log_info "Creating systemd service for $SERVICE_NAME..."

cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Praktiki AI Matching Service
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
Environment="PATH=$VENV_DIR/bin"
Environment="TRANSFORMERS_CACHE=$APP_DIR/model_cache"
Environment="HF_HOME=$APP_DIR/model_cache"
EnvironmentFile=-$APP_DIR/.env
ExecStart=$VENV_DIR/bin/gunicorn app.main:app \\
    --workers 2 \\
    --worker-class uvicorn.workers.UvicornWorker \\
    --bind 0.0.0.0:$APP_PORT \\
    --timeout 120 \\
    --access-logfile /var/log/${SERVICE_NAME}/access.log \\
    --error-logfile /var/log/${SERVICE_NAME}/error.log \\
    --capture-output \\
    --enable-stdio-inheritance
Restart=always
RestartSec=10

# Memory limits to prevent OOM
MemoryMax=3G
MemoryHigh=2G

[Install]
WantedBy=multi-user.target
EOF

#-------------------------------------------------------------------------------
# Step 7: Create Log Directory
#-------------------------------------------------------------------------------
log_info "Creating log directory..."
mkdir -p /var/log/${SERVICE_NAME}
chown -R $APP_USER:$APP_USER /var/log/${SERVICE_NAME}

#-------------------------------------------------------------------------------
# Step 8: Configure Nginx (Optional Reverse Proxy)
#-------------------------------------------------------------------------------
log_info "Configuring Nginx reverse proxy..."

cat > /etc/nginx/sites-available/${SERVICE_NAME} << EOF
server {
    listen 80;
    server_name _;  # Replace with your domain

    location / {
        proxy_pass http://127.0.0.1:$APP_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Increased timeouts for ML inference
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:$APP_PORT/;
        proxy_http_version 1.1;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/${SERVICE_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

#-------------------------------------------------------------------------------
# Step 9: Set Permissions
#-------------------------------------------------------------------------------
log_info "Setting correct permissions..."
chown -R $APP_USER:$APP_USER $APP_DIR

#-------------------------------------------------------------------------------
# Step 10: Start AI Matching Service
#-------------------------------------------------------------------------------
log_info "Starting AI Matching service..."

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl start ${SERVICE_NAME}

#===============================================================================
# RESUME PARSER SERVICE (port 8002)
#===============================================================================
RESUME_DIR="/home/ubuntu/ai_matching/resume_parser"
RESUME_VENV="$RESUME_DIR/venv"
RESUME_SERVICE="praktiki-resume-parser"
RESUME_PORT=8002

if [ -d "$RESUME_DIR" ]; then
    log_step "Setting up Resume Parser Service on port $RESUME_PORT..."

    #---------------------------------------------------------------------------
    # Resume Parser: Create Virtual Environment
    #---------------------------------------------------------------------------
    log_info "Creating resume parser virtual environment..."
    cd "$RESUME_DIR"
    python3 -m venv "$RESUME_VENV"
    source "$RESUME_VENV/bin/activate"
    pip install --upgrade pip

    log_info "Installing resume parser dependencies..."
    pip install -r requirements.txt
    pip install gunicorn

    # Download spaCy model
    log_info "Downloading spaCy model..."
    python3 -m spacy download en_core_web_sm || true

    deactivate

    #---------------------------------------------------------------------------
    # Resume Parser: Environment Configuration
    #---------------------------------------------------------------------------
    if [ ! -f "$RESUME_DIR/.env" ]; then
        log_warn "Resume parser .env not found! Creating default..."
        cat > "$RESUME_DIR/.env" << 'EOF'
DEBUG=false
ENVIRONMENT=production
EOF
    fi

    #---------------------------------------------------------------------------
    # Resume Parser: Create Systemd Service
    #---------------------------------------------------------------------------
    log_info "Creating systemd service for $RESUME_SERVICE..."

    cat > /etc/systemd/system/${RESUME_SERVICE}.service << EOF
[Unit]
Description=Praktiki Resume Parser Service
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$RESUME_DIR
Environment="PATH=$RESUME_VENV/bin"
EnvironmentFile=-$RESUME_DIR/.env
ExecStart=$RESUME_VENV/bin/gunicorn main:app \\
    --workers 2 \\
    --worker-class uvicorn.workers.UvicornWorker \\
    --bind 0.0.0.0:$RESUME_PORT \\
    --timeout 120 \\
    --access-logfile /var/log/${RESUME_SERVICE}/access.log \\
    --error-logfile /var/log/${RESUME_SERVICE}/error.log \\
    --capture-output \\
    --enable-stdio-inheritance
Restart=always
RestartSec=10

MemoryMax=2G
MemoryHigh=1.5G

[Install]
WantedBy=multi-user.target
EOF

    #---------------------------------------------------------------------------
    # Resume Parser: Log Directory
    #---------------------------------------------------------------------------
    mkdir -p /var/log/${RESUME_SERVICE}
    chown -R $APP_USER:$APP_USER /var/log/${RESUME_SERVICE}

    #---------------------------------------------------------------------------
    # Resume Parser: Nginx config (add upstream block for port 8002)
    #---------------------------------------------------------------------------
    log_info "Adding resume parser to Nginx config..."

    cat > /etc/nginx/sites-available/${RESUME_SERVICE} << EOF
server {
    listen 8002;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:$RESUME_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;

        # Increased timeouts for ML inference
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
    }
}
EOF

    ln -sf /etc/nginx/sites-available/${RESUME_SERVICE} /etc/nginx/sites-enabled/

    #---------------------------------------------------------------------------
    # Resume Parser: Set Permissions & Start
    #---------------------------------------------------------------------------
    chown -R $APP_USER:$APP_USER $RESUME_DIR

    systemctl daemon-reload
    systemctl enable ${RESUME_SERVICE}
    systemctl start ${RESUME_SERVICE}

    log_info "✅ Resume Parser service configured on port $RESUME_PORT!"
else
    log_warn "Resume parser directory not found at $RESUME_DIR, skipping..."
fi

#-------------------------------------------------------------------------------
# Restart Nginx (for both services)
#-------------------------------------------------------------------------------
nginx -t
systemctl restart nginx

#-------------------------------------------------------------------------------
# Configure Firewall
#-------------------------------------------------------------------------------
log_info "Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow $APP_PORT/tcp   # AI Matching direct access
ufw allow $RESUME_PORT/tcp  # Resume Parser direct access
ufw --force enable

#-------------------------------------------------------------------------------
# Verify Deployment
#-------------------------------------------------------------------------------
log_info "Verifying deployment (services may take longer to start)..."
sleep 10  # Extra time for ML model loading

if systemctl is-active --quiet ${SERVICE_NAME}; then
    log_info "✅ ${SERVICE_NAME} service is running!"
else
    log_error "❌ ${SERVICE_NAME} service failed to start!"
    log_error "Check logs: journalctl -u ${SERVICE_NAME} -n 50"
fi

# Test AI Matching API
if curl -s http://localhost:$APP_PORT/ > /dev/null; then
    log_info "✅ AI Matching API is responding on port $APP_PORT!"
else
    log_warn "⚠️ AI Matching not responding yet. ML models may still be loading..."
fi

# Test Resume Parser API
if [ -d "$RESUME_DIR" ]; then
    if systemctl is-active --quiet ${RESUME_SERVICE}; then
        log_info "✅ ${RESUME_SERVICE} service is running!"
    else
        log_error "❌ ${RESUME_SERVICE} service failed to start!"
        log_error "Check logs: journalctl -u ${RESUME_SERVICE} -n 50"
    fi

    if curl -s http://localhost:$RESUME_PORT/ > /dev/null; then
        log_info "✅ Resume Parser API is responding on port $RESUME_PORT!"
    else
        log_warn "⚠️ Resume Parser not responding yet..."
    fi
fi

echo ""
echo "=========================================="
echo "  AI Matching + Resume Parser Setup Complete!"
echo "=========================================="
echo ""
echo "Service Status:"
echo "  systemctl status ${SERVICE_NAME}"
echo "  systemctl status ${RESUME_SERVICE}"
echo ""
echo "View Logs:"
echo "  journalctl -u ${SERVICE_NAME} -f"
echo "  journalctl -u ${RESUME_SERVICE} -f"
echo ""
echo "API URLs:"
echo "  AI Matching:    http://$(curl -s ifconfig.me):$APP_PORT"
echo "  Resume Parser:  http://$(curl -s ifconfig.me):$RESUME_PORT"
echo ""
echo "⚠️  NOTE: This instance requires more RAM for ML models."
echo "⚠️  Recommended instance: t2.medium or larger (4GB+ RAM)"
echo ""

