#!/bin/bash
#===============================================================================
# Praktiki Frontend - EC2 Setup Script
# Vite React/TypeScript Application
#===============================================================================

set -e  # Exit on error

echo "=========================================="
echo "  Praktiki Frontend Setup Script"
echo "=========================================="

# Configuration
APP_DIR="/home/ubuntu/frontend"
BUILD_DIR="$APP_DIR/dist"
SERVICE_NAME="praktiki-frontend"
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

log_info "Installing system dependencies..."
apt-get install -y \
    curl \
    nginx \
    git \
    htop \
    unzip

#-------------------------------------------------------------------------------
# Step 2: Install Node.js (v20 LTS)
#-------------------------------------------------------------------------------
log_info "Installing Node.js v20 LTS..."

# Install nvm and node
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version

#-------------------------------------------------------------------------------
# Step 3: Build Frontend
#-------------------------------------------------------------------------------
log_info "Building frontend application..."

if [ ! -d "$APP_DIR" ]; then
    log_error "Application directory $APP_DIR not found!"
    log_error "Please upload frontend folder to /home/ubuntu/ first."
    exit 1
fi

cd "$APP_DIR"

# Check for .env file
if [ ! -f "$APP_DIR/.env" ]; then
    log_warn ".env file not found! Creating from template..."
    cat > "$APP_DIR/.env" << 'EOF'
# API Configuration - UPDATE THESE WITH YOUR EC2 IPs
VITE_API_URL=http://YOUR_BACKEND_EC2_IP:8000
VITE_AI_MATCHING_URL=http://YOUR_AI_MATCHING_EC2_IP:8001

# App Configuration
VITE_APP_NAME=Praktiki
VITE_APP_VERSION=1.0.0
EOF
    log_error "⚠️ IMPORTANT: Update .env with your actual EC2 IP addresses!"
    log_error "Edit $APP_DIR/.env before proceeding."
fi

# Install dependencies
log_info "Installing npm dependencies..."
npm ci --production=false

# Build for production
log_info "Building production bundle..."
npm run build

if [ ! -d "$BUILD_DIR" ]; then
    log_error "Build failed! dist directory not found."
    exit 1
fi

log_info "Build completed successfully!"

#-------------------------------------------------------------------------------
# Step 4: Configure Nginx
#-------------------------------------------------------------------------------
log_info "Configuring Nginx for SPA..."

cat > /etc/nginx/sites-available/${SERVICE_NAME} << 'EOF'
server {
    listen 80;
    server_name _;  # Replace with your domain

    root /home/ubuntu/frontend/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # SPA fallback - all routes serve index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Health check
    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/${SERVICE_NAME} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
nginx -t

#-------------------------------------------------------------------------------
# Step 5: Set Permissions
#-------------------------------------------------------------------------------
log_info "Setting correct permissions..."
chown -R $APP_USER:$APP_USER $APP_DIR
chmod -R 755 $BUILD_DIR

#-------------------------------------------------------------------------------
# Step 6: Start Nginx
#-------------------------------------------------------------------------------
log_info "Starting Nginx..."
systemctl enable nginx
systemctl restart nginx

#-------------------------------------------------------------------------------
# Step 7: Configure Firewall
#-------------------------------------------------------------------------------
log_info "Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable

#-------------------------------------------------------------------------------
# Step 8: Verify Deployment
#-------------------------------------------------------------------------------
log_info "Verifying deployment..."
sleep 2

if systemctl is-active --quiet nginx; then
    log_info "✅ Nginx is running!"
else
    log_error "❌ Nginx failed to start!"
    log_error "Check logs: journalctl -u nginx -n 50"
    exit 1
fi

# Test HTTP response
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [ "$HTTP_CODE" = "200" ]; then
    log_info "✅ Frontend is serving correctly!"
else
    log_warn "⚠️ Unexpected HTTP response: $HTTP_CODE"
fi

echo ""
echo "=========================================="
echo "  Frontend Setup Complete!"
echo "=========================================="
echo ""
echo "Nginx Status: systemctl status nginx"
echo "View Logs: sudo tail -f /var/log/nginx/error.log"
echo "Website URL: http://$(curl -s ifconfig.me)"
echo ""
echo "⚠️  IMPORTANT: Update .env with production API URLs and rebuild!"
echo "    1. Edit $APP_DIR/.env"
echo "    2. Run: cd $APP_DIR && npm run build"
echo "    3. Nginx will serve the new build automatically"
echo ""

#-------------------------------------------------------------------------------
# Optional: Setup SSL with Let's Encrypt
#-------------------------------------------------------------------------------
cat << 'SSLINFO'
To set up HTTPS with Let's Encrypt:

1. Install Certbot:
   sudo apt install certbot python3-certbot-nginx

2. Obtain certificate:
   sudo certbot --nginx -d yourdomain.com

3. Auto-renewal is configured automatically.

SSLINFO
