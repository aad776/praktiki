#!/bin/bash
#===============================================================================
# Praktiki Backend (PythonProject) - EC2 Setup Script
# FastAPI backend with PostgreSQL
#===============================================================================

set -e  # Exit on error

echo "=========================================="
echo "  Praktiki Backend Setup Script"
echo "=========================================="

# Configuration
APP_DIR="/home/ubuntu/PythonProject"
VENV_DIR="$APP_DIR/venv"
SERVICE_NAME="praktiki-backend"
APP_PORT=8000
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
    libpq-dev \
    nginx \
    supervisor \
    git \
    curl \
    htop

#-------------------------------------------------------------------------------
# Step 2: Create Python Virtual Environment
#-------------------------------------------------------------------------------
log_info "Setting up Python virtual environment..."

if [ ! -d "$APP_DIR" ]; then
    log_error "Application directory $APP_DIR not found!"
    log_error "Please upload PythonProject to /home/ubuntu/ first."
    exit 1
fi

cd "$APP_DIR"

# Create virtual environment
python3 -m venv "$VENV_DIR"

# Activate and install dependencies
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn  # Production WSGI server

#-------------------------------------------------------------------------------
# Step 3: Environment Configuration
#-------------------------------------------------------------------------------
log_info "Checking environment configuration..."

if [ ! -f "$APP_DIR/.env" ]; then
    log_warn ".env file not found! Creating from template..."
    cat > "$APP_DIR/.env" << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/praktiki

# JWT Configuration
JWT_SECRET=CHANGE_THIS_TO_A_SECURE_SECRET_KEY

# Application Settings
DEBUG=false
ENVIRONMENT=production
EOF
    log_warn "Please update .env file with production values!"
fi

#-------------------------------------------------------------------------------
# Step 4: Create Systemd Service
#-------------------------------------------------------------------------------
log_info "Creating systemd service for $SERVICE_NAME..."

cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Praktiki Backend API Service
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
Environment="PATH=$VENV_DIR/bin"
EnvironmentFile=$APP_DIR/.env
ExecStart=$VENV_DIR/bin/gunicorn main:app \\
    --workers 4 \\
    --worker-class uvicorn.workers.UvicornWorker \\
    --bind 0.0.0.0:$APP_PORT \\
    --access-logfile /var/log/${SERVICE_NAME}/access.log \\
    --error-logfile /var/log/${SERVICE_NAME}/error.log \\
    --capture-output \\
    --enable-stdio-inheritance
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

#-------------------------------------------------------------------------------
# Step 5: Create Log Directory
#-------------------------------------------------------------------------------
log_info "Creating log directory..."
mkdir -p /var/log/${SERVICE_NAME}
chown -R $APP_USER:$APP_USER /var/log/${SERVICE_NAME}

#-------------------------------------------------------------------------------
# Step 6: Configure Nginx (Optional Reverse Proxy)
#-------------------------------------------------------------------------------
log_info "Configuring Nginx reverse proxy..."

cat > /etc/nginx/sites-available/${SERVICE_NAME} << EOF
server {
    listen 80;
    server_name _;  # Replace with your domain

    # Increase max body size for file uploads
    client_max_body_size 50M;

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
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
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
# Step 7: Set Permissions
#-------------------------------------------------------------------------------
log_info "Setting correct permissions..."
chown -R $APP_USER:$APP_USER $APP_DIR

#-------------------------------------------------------------------------------
# Step 8: Start Services
#-------------------------------------------------------------------------------
log_info "Starting services..."

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl start ${SERVICE_NAME}
systemctl restart nginx

#-------------------------------------------------------------------------------
# Step 9: Configure Firewall
#-------------------------------------------------------------------------------
log_info "Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow $APP_PORT/tcp  # Direct API access (optional)
ufw --force enable

#-------------------------------------------------------------------------------
# Step 10: Verify Deployment
#-------------------------------------------------------------------------------
log_info "Verifying deployment..."
sleep 3

if systemctl is-active --quiet ${SERVICE_NAME}; then
    log_info "✅ ${SERVICE_NAME} service is running!"
else
    log_error "❌ ${SERVICE_NAME} service failed to start!"
    log_error "Check logs: journalctl -u ${SERVICE_NAME} -n 50"
    exit 1
fi

# Test API endpoint
if curl -s http://localhost:$APP_PORT/ > /dev/null; then
    log_info "✅ API is responding on port $APP_PORT!"
else
    log_warn "⚠️ API not responding yet. It may still be starting..."
fi

echo ""
echo "=========================================="
echo "  Backend Setup Complete!"
echo "=========================================="
echo ""
echo "Service Status: systemctl status ${SERVICE_NAME}"
echo "View Logs: journalctl -u ${SERVICE_NAME} -f"
echo "API URL: http://$(curl -s ifconfig.me):$APP_PORT"
echo ""
echo "⚠️  IMPORTANT: Update .env file with production values!"
echo ""
