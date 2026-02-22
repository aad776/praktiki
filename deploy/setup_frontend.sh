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

log_step() {
    echo -e "\n${GREEN}===> $1${NC}\n"
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

# Clean node_modules (full dir cleanup is done by deploy_all.sh before upload)
log_info "Cleaning node_modules..."
rm -rf node_modules package-lock.json

# Remove any stale package.json in parent directories (npm walks up the tree)
rm -f /home/ubuntu/package.json /home/ubuntu/package-lock.json
rm -rf /home/ubuntu/node_modules

# Overwrite vite.config with a guaranteed Tailwind v3-compatible version
# (guards against stale config files that import @tailwindcss/vite from Tailwind v4)
log_info "Ensuring vite.config is compatible with Tailwind v3..."
rm -f vite.config.js vite.config.ts vite.config.mjs
cat > vite.config.js << 'VITEEOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    host: true
  }
});
VITEEOF

# Ensure postcss.config.cjs is present (CJS format is required with Tailwind v3 in ESM projects)
log_info "Ensuring postcss.config.cjs is present for Tailwind v3..."
rm -f postcss.config.js postcss.config.mjs
cat > postcss.config.cjs << 'POSTCSSEOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};
POSTCSSEOF

# Pin exact versions in package.json BEFORE installing to prevent version resolution issues
log_info "Pinning exact dependency versions..."
sed -i 's/"tailwindcss": "[^"]*"/"tailwindcss": "3.4.17"/' package.json
sed -i 's/"vite": "[^"]*"/"vite": "5.4.21"/' package.json
sed -i 's/"postcss": "[^"]*"/"postcss": "8.4.49"/' package.json
sed -i 's/"autoprefixer": "[^"]*"/"autoprefixer": "10.4.20"/' package.json
# Remove Tailwind v4 packages from package.json if present
sed -i '/"@tailwindcss\/vite"/d' package.json
sed -i '/"@tailwindcss\/postcss"/d' package.json

# Single clean install from pinned package.json
log_info "Installing npm dependencies..."
npm install

# Remove any Tailwind v4 packages that may have snuck in as transitive deps
rm -rf node_modules/@tailwindcss/vite node_modules/@tailwindcss/postcss

# Fix Tailwind v4 CSS syntax in index.css if present
# v4 uses '@import "tailwindcss"' but v3 uses '@tailwind base/components/utilities'
log_info "Checking for Tailwind v4 CSS syntax in src/index.css..."
if grep -q '@import "tailwindcss"' src/index.css 2>/dev/null; then
    log_warn "Found Tailwind v4 @import syntax - converting to v3 directives..."
    sed -i 's|@import "tailwindcss";||g' src/index.css
    FONTS_IMPORT='@import url('\''https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap'\'');'
    TW_DIRECTIVES="@tailwind base;\n@tailwind components;\n@tailwind utilities;"
    printf '%s\n\n%s\n' "${FONTS_IMPORT}" "${TW_DIRECTIVES}" | cat - src/index.css > /tmp/index.css.tmp
    mv /tmp/index.css.tmp src/index.css
    log_info "index.css converted to Tailwind v3 syntax."
else
    log_info "index.css already uses Tailwind v3 syntax - no changes needed."
fi

# Verify versions before building
log_info "Installed versions:"
echo "  Vite: $(npx vite --version 2>/dev/null || echo 'unknown')"
echo "  Tailwind: $(cat node_modules/tailwindcss/package.json | grep '"version"' | head -1)"
echo "  Node: $(node --version)"

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

#===============================================================================
# ABC-PORTAL FRONTEND (port 3000)
#===============================================================================
ABC_FE_DIR="/home/ubuntu/abc-frontend"
ABC_FE_SERVICE="abc-portal-frontend"
ABC_FE_PORT=3000

if [ -d "$ABC_FE_DIR" ]; then
    log_step "Setting up ABC-Portal Frontend on port $ABC_FE_PORT..."

    cd "$ABC_FE_DIR"

    # Check for .env file
    if [ ! -f "$ABC_FE_DIR/.env" ]; then
        log_warn "ABC frontend .env not found! Creating default..."
        cat > "$ABC_FE_DIR/.env" << 'EOF'
VITE_API_URL=http://YOUR_BACKEND_EC2_IP:8003
VITE_APP_NAME=ABC Credits Portal
EOF
        log_warn "⚠️ Update ABC frontend .env with the Backend EC2 IP!"
    fi

    # Install dependencies and build
    log_info "Installing ABC frontend npm dependencies..."
    npm ci --production=false

    log_info "Building ABC frontend production bundle..."
    npm run build

    ABC_BUILD_DIR="$ABC_FE_DIR/dist"
    if [ ! -d "$ABC_BUILD_DIR" ]; then
        log_error "ABC frontend build failed! dist directory not found."
    else
        log_info "ABC frontend build completed!"

        # Set permissions
        chown -R $APP_USER:$APP_USER $ABC_FE_DIR
        chmod -R 755 $ABC_BUILD_DIR

        # Nginx config for port 3000
        log_info "Configuring Nginx for ABC-Portal on port $ABC_FE_PORT..."

        cat > /etc/nginx/sites-available/${ABC_FE_SERVICE} << 'EOF'
server {
    listen 3000;
    server_name _;

    root /home/ubuntu/abc-frontend/dist;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /health {
        return 200 'OK';
        add_header Content-Type text/plain;
    }

    location ~ /\. {
        deny all;
    }
}
EOF

        ln -sf /etc/nginx/sites-available/${ABC_FE_SERVICE} /etc/nginx/sites-enabled/
        log_info "✅ ABC-Portal Frontend configured on port $ABC_FE_PORT!"
    fi
else
    log_warn "ABC-Portal frontend directory not found at $ABC_FE_DIR, skipping..."
fi

#-------------------------------------------------------------------------------
# Restart Nginx (for both frontends)
#-------------------------------------------------------------------------------
nginx -t
systemctl enable nginx
systemctl restart nginx

#-------------------------------------------------------------------------------
# Configure Firewall
#-------------------------------------------------------------------------------
log_info "Configuring firewall..."
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP (Praktiki Frontend)
ufw allow 443/tcp   # HTTPS
ufw allow $ABC_FE_PORT/tcp  # ABC Portal Frontend
ufw --force enable

#-------------------------------------------------------------------------------
# Verify Deployment
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

# Test Praktiki Frontend
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/)
if [ "$HTTP_CODE" = "200" ]; then
    log_info "✅ Praktiki Frontend is serving correctly!"
else
    log_warn "⚠️ Praktiki Frontend: unexpected HTTP response: $HTTP_CODE"
fi

# Test ABC Portal Frontend
if [ -d "$ABC_FE_DIR/dist" ]; then
    ABC_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$ABC_FE_PORT/)
    if [ "$ABC_HTTP_CODE" = "200" ]; then
        log_info "✅ ABC Portal Frontend is serving correctly on port $ABC_FE_PORT!"
    else
        log_warn "⚠️ ABC Portal Frontend: unexpected HTTP response: $ABC_HTTP_CODE"
    fi
fi

echo ""
echo "=========================================="
echo "  Frontend Setup Complete!"
echo "=========================================="
echo ""
echo "Nginx Status: systemctl status nginx"
echo "View Logs: sudo tail -f /var/log/nginx/error.log"
echo ""
echo "Website URLs:"
echo "  Praktiki:   http://$(curl -s ifconfig.me)"
echo "  ABC Portal: http://$(curl -s ifconfig.me):$ABC_FE_PORT"
echo ""
echo "⚠️  IMPORTANT: Update .env files with production API URLs and rebuild!"
echo "    Praktiki: Edit $APP_DIR/.env, then: cd $APP_DIR && npm run build"
echo "    ABC Portal: Edit $ABC_FE_DIR/.env, then: cd $ABC_FE_DIR && npm run build"
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

