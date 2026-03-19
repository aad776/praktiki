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

# Resume Parser Service (AI Matching EC2)
# Update this to your parser service URL, e.g. http://<AI_MATCHING_IP>:8002
PARSER_SERVICE_URL=http://127.0.0.1:8002
PARSER_SERVICE_TIMEOUT_SECONDS=45

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

# Step 8: Start Praktiki Backend Service
#-------------------------------------------------------------------------------
log_info "Starting Praktiki backend service..."

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl start ${SERVICE_NAME}

#===============================================================================
# ABC-PORTAL BACKEND SERVICE (port 8003)
#===============================================================================
ABC_DIR="/home/ubuntu/ABC-Portal"
ABC_VENV="$ABC_DIR/venv"
ABC_SERVICE="abc-portal-backend"
ABC_PORT=8003

if [ -d "$ABC_DIR/backend" ]; then
    log_step "Setting up ABC-Portal Backend on port $ABC_PORT..."

    #---------------------------------------------------------------------------
    # ABC Backend: Create Virtual Environment
    #---------------------------------------------------------------------------
    log_info "Creating ABC-Portal virtual environment..."
    cd "$ABC_DIR"
    python3 -m venv "$ABC_VENV"
    source "$ABC_VENV/bin/activate"
    pip install --upgrade pip

    log_info "Installing ABC-Portal dependencies..."
    pip install -r requirements.txt
    pip install gunicorn

    deactivate

    #---------------------------------------------------------------------------
    # ABC Backend: Environment Configuration
    #---------------------------------------------------------------------------
    if [ ! -f "$ABC_DIR/backend/.env" ]; then
        log_warn "ABC-Portal .env not found! Creating default..."
        cat > "$ABC_DIR/backend/.env" << 'EOF'
DATABASE_URL=postgresql://user:password@localhost:5432/internship
DEBUG=false
ENVIRONMENT=production
EOF
        log_warn "Please update ABC-Portal .env with production values!"
    fi

    #---------------------------------------------------------------------------
    # ABC Backend: Create Systemd Service
    #---------------------------------------------------------------------------
    log_info "Creating systemd service for $ABC_SERVICE..."

    cat > /etc/systemd/system/${ABC_SERVICE}.service << EOF
[Unit]
Description=ABC Credits Portal Backend API
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$ABC_DIR
Environment="PATH=$ABC_VENV/bin"
EnvironmentFile=-$ABC_DIR/backend/.env
ExecStart=$ABC_VENV/bin/gunicorn backend.main:app \\
    --workers 2 \\
    --worker-class uvicorn.workers.UvicornWorker \\
    --bind 0.0.0.0:$ABC_PORT \\
    --access-logfile /var/log/${ABC_SERVICE}/access.log \\
    --error-logfile /var/log/${ABC_SERVICE}/error.log \\
    --capture-output \\
    --enable-stdio-inheritance
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    #---------------------------------------------------------------------------
    # ABC Backend: Log Directory
    #---------------------------------------------------------------------------
    mkdir -p /var/log/${ABC_SERVICE}
    chown -R $APP_USER:$APP_USER /var/log/${ABC_SERVICE}

    #---------------------------------------------------------------------------
    # ABC Backend: Nginx config
    #---------------------------------------------------------------------------
    log_info "Adding ABC-Portal to Nginx config..."

    cat > /etc/nginx/sites-available/${ABC_SERVICE} << EOF
server {
    listen 8003;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:$ABC_PORT;
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
}
EOF

    ln -sf /etc/nginx/sites-available/${ABC_SERVICE} /etc/nginx/sites-enabled/

    #---------------------------------------------------------------------------
    # ABC Backend: Set Permissions & Start
    #---------------------------------------------------------------------------
    chown -R $APP_USER:$APP_USER $ABC_DIR

    systemctl daemon-reload
    systemctl enable ${ABC_SERVICE}
    systemctl start ${ABC_SERVICE}

    log_info "✅ ABC-Portal Backend configured on port $ABC_PORT!"
else
    log_warn "ABC-Portal directory not found at $ABC_DIR, skipping..."
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
ufw allow $APP_PORT/tcp  # Praktiki API
ufw allow $ABC_PORT/tcp  # ABC Portal API
ufw --force enable

#-------------------------------------------------------------------------------
# Verify Deployment
#-------------------------------------------------------------------------------
log_info "Verifying deployment..."
sleep 3

if systemctl is-active --quiet ${SERVICE_NAME}; then
    log_info "✅ ${SERVICE_NAME} service is running!"
else
    log_error "❌ ${SERVICE_NAME} service failed to start!"
    log_error "Check logs: journalctl -u ${SERVICE_NAME} -n 50"
fi

# Test Praktiki API
if curl -s http://localhost:$APP_PORT/ > /dev/null; then
    log_info "✅ Praktiki API is responding on port $APP_PORT!"
else
    log_warn "⚠️ Praktiki API not responding yet."
fi

# Test ABC Portal API
if [ -d "$ABC_DIR/backend" ]; then
    if systemctl is-active --quiet ${ABC_SERVICE}; then
        log_info "✅ ${ABC_SERVICE} service is running!"
    else
        log_error "❌ ${ABC_SERVICE} service failed to start!"
        log_error "Check logs: journalctl -u ${ABC_SERVICE} -n 50"
    fi

    if curl -s http://localhost:$ABC_PORT/ > /dev/null; then
        log_info "✅ ABC Portal API is responding on port $ABC_PORT!"
    else
        log_warn "⚠️ ABC Portal API not responding yet."
    fi
fi

echo ""
echo "=========================================="
echo "  Backend Setup Complete!"
echo "=========================================="
echo ""
echo "Service Status:"
echo "  systemctl status ${SERVICE_NAME}"
echo "  systemctl status ${ABC_SERVICE}"
echo ""
echo "View Logs:"
echo "  journalctl -u ${SERVICE_NAME} -f"
echo "  journalctl -u ${ABC_SERVICE} -f"
echo ""
echo "API URLs:"
echo "  Praktiki:   http://$(curl -s ifconfig.me):$APP_PORT"
echo "  ABC Portal: http://$(curl -s ifconfig.me):$ABC_PORT"
echo ""
echo "⚠️  IMPORTANT: Update .env files with production values!"
echo ""

