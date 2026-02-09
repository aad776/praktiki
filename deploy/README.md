# Praktiki - AWS EC2 Deployment Guide

> Complete guide to deploying the Praktiki platform (Campus-to-Career Placement & Internship Ecosystem) on AWS EC2 instances.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack Summary](#2-technology-stack-summary)
3. [AWS Prerequisites](#3-aws-prerequisites)
4. [Directory Structure](#4-directory-structure)
5. [EC2 Instance Setup](#5-ec2-instance-setup)
6. [Deployment Methods](#6-deployment-methods)
7. [Environment Configuration](#7-environment-configuration)
8. [Service Management](#8-service-management)
9. [Post-Deployment Verification](#9-post-deployment-verification)
10. [SSL/HTTPS Setup](#10-sslhttps-setup)
11. [Monitoring & Logs](#11-monitoring--logs)
12. [Troubleshooting](#12-troubleshooting)
13. [Security Checklist](#13-security-checklist)

---

## 1. Architecture Overview

Praktiki is deployed as **three separate services**, each running on its own EC2 instance:

```
                        ┌──────────────────────┐
                        │      Internet         │
                        └──────────┬───────────┘
                                   │
            ┌──────────────────────┼──────────────────────┐
            │                      │                      │
            ▼                      ▼                      ▼
   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
   │   EC2 Instance  │   │   EC2 Instance  │   │   EC2 Instance  │
   │   (Frontend)    │   │   (Backend)     │   │  (AI Matching)  │
   │                 │   │                 │   │                 │
   │  Nginx :80      │   │  Nginx :80      │   │  Nginx :80      │
   │      │          │   │      │          │   │      │          │
   │      ▼          │   │      ▼          │   │      ▼          │
   │  Vite/React     │   │  Gunicorn :8000 │   │  Gunicorn :8001 │
   │  Static Build   │   │  + Uvicorn      │   │  + Uvicorn      │
   │  (dist/)        │   │  FastAPI        │   │  FastAPI + ML   │
   └─────────────────┘   └────────┬────────┘   └─────────────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │   PostgreSQL     │
                         │   (RDS or local) │
                         └─────────────────┘
```

| Service | Source Directory | EC2 Port | Nginx Port | Description |
|---------|----------------|----------|------------|-------------|
| **Frontend** | `frontend/` | N/A (static) | 80 / 443 | React + Vite SPA served by Nginx |
| **Backend API** | `PythonProject/` | 8000 | 80 | FastAPI with PostgreSQL (Gunicorn + Uvicorn workers) |
| **AI Matching** | `ai_matching/` | 8001 | 80 | FastAPI with ML models (Sentence-Transformers, PyTorch) |

---

## 2. Technology Stack Summary

### What We Use and Where to Find It

#### Frontend (`frontend/`)

| Technology | Purpose | Where to Find / Docs |
|------------|---------|----------------------|
| **React 18** | UI library | [react.dev](https://react.dev) |
| **Vite 5** | Build tool & dev server | [vitejs.dev](https://vitejs.dev) |
| **TypeScript** | Type-safe JavaScript | [typescriptlang.org](https://www.typescriptlang.org) |
| **Tailwind CSS 3** | Utility-first CSS framework | [tailwindcss.com](https://tailwindcss.com) |
| **React Router DOM 6** | Client-side routing | [reactrouter.com](https://reactrouter.com) |
| **Axios** | HTTP client for API calls | [axios-http.com](https://axios-http.com) |
| **Leaflet + React-Leaflet** | Map visualization | [leafletjs.com](https://leafletjs.com) |
| **jwt-decode** | JWT token decoding on client | [npmjs.com/package/jwt-decode](https://www.npmjs.com/package/jwt-decode) |
| **React Icons** | Icon library | [react-icons.github.io](https://react-icons.github.io/react-icons) |

> Config files: `vite.config.ts`, `tailwind.config.cjs`, `postcss.config.cjs`, `tsconfig.json`

#### Backend API (`PythonProject/`)

| Technology | Purpose | Where to Find / Docs |
|------------|---------|----------------------|
| **FastAPI** | Async Python web framework | [fastapi.tiangolo.com](https://fastapi.tiangolo.com) |
| **Uvicorn** | ASGI server | [uvicorn.org](https://www.uvicorn.org) |
| **Gunicorn** | Production process manager | [gunicorn.org](https://gunicorn.org) |
| **SQLAlchemy** | ORM for database operations | [sqlalchemy.org](https://www.sqlalchemy.org) |
| **Alembic** | Database migration tool | [alembic.sqlalchemy.org](https://alembic.sqlalchemy.org) |
| **Pydantic** | Data validation & settings | [docs.pydantic.dev](https://docs.pydantic.dev) |
| **python-jose** | JWT token creation & validation | [pypi.org/project/python-jose](https://pypi.org/project/python-jose/) |
| **passlib + bcrypt** | Password hashing | [passlib.readthedocs.io](https://passlib.readthedocs.io) |
| **psycopg2-binary** | PostgreSQL adapter | [psycopg.org](https://www.psycopg.org) |
| **email-validator** | Email validation | [pypi.org/project/email-validator](https://pypi.org/project/email-validator/) |

> Config files: `config.py`, `alembic.ini`, `requirements.txt`

#### AI Matching Service (`ai_matching/`)

| Technology | Purpose | Where to Find / Docs |
|------------|---------|----------------------|
| **FastAPI** | Async API framework | [fastapi.tiangolo.com](https://fastapi.tiangolo.com) |
| **Sentence-Transformers** | Text embedding generation (uses `all-MiniLM-L6-v2`) | [sbert.net](https://www.sbert.net) |
| **PyTorch** | ML framework (dependency of transformers) | [pytorch.org](https://pytorch.org) |
| **scikit-learn** | Cosine similarity, ML utilities | [scikit-learn.org](https://scikit-learn.org) |
| **NumPy** | Numerical computation for vectors | [numpy.org](https://numpy.org) |

> Key modules: `app/matching/`, `app/embeddings/`, `app/skills/`, `app/feedback/`

#### Infrastructure & Deployment

| Technology | Purpose | Where to Find / Docs |
|------------|---------|----------------------|
| **AWS EC2** | Compute instances | [AWS EC2 Console](https://console.aws.amazon.com/ec2) |
| **Ubuntu 22.04 LTS** | Server OS | [ubuntu.com](https://ubuntu.com) |
| **Nginx** | Reverse proxy & static file server | [nginx.org](https://nginx.org) |
| **systemd** | Service management | [systemd.io](https://systemd.io) |
| **UFW** | Firewall management | Built into Ubuntu |
| **PostgreSQL** | Primary database | [postgresql.org](https://www.postgresql.org) |
| **Node.js 20 LTS** | Frontend build tool runtime | [nodejs.org](https://nodejs.org) |

---

## 3. AWS Prerequisites

### 3.1 Create EC2 Instances

Go to **[AWS EC2 Console](https://console.aws.amazon.com/ec2)** and launch **three instances**:

| Instance | Recommended Type | RAM | Purpose | Why This Size |
|----------|-----------------|-----|---------|---------------|
| Frontend | `t2.micro` | 1 GB | Serves static files via Nginx | Minimal resources needed for static content |
| Backend API | `t2.micro` or `t2.small` | 1-2 GB | Runs FastAPI + PostgreSQL queries | Moderate CPU/memory for API handling |
| AI Matching | `t2.medium` **minimum** | 4 GB | Runs ML models (PyTorch, Transformers) | ML model loading requires 2-3 GB RAM |

**AMI**: Ubuntu 22.04 LTS (search "Ubuntu" in AMI selection)

### 3.2 Create a Key Pair

1. In EC2 Console, go to **Network & Security > Key Pairs**
2. Click **Create key pair**
3. Name: `praktiki-key` (or any name)
4. Format: `.pem`
5. Download and save the `.pem` file securely
6. Set permissions (on your local machine):

```bash
chmod 400 praktiki-key.pem
```

### 3.3 Configure Security Groups

Create or modify Security Groups for each instance:

**Frontend Security Group:**

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | Your IP | Remote access |
| HTTP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | 443 | 0.0.0.0/0 | Secure web traffic |

**Backend Security Group:**

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | Your IP | Remote access |
| Custom TCP | 8000 | Frontend SG / 0.0.0.0/0 | API access |
| HTTP | 80 | 0.0.0.0/0 | Nginx proxy |

**AI Matching Security Group:**

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | Your IP | Remote access |
| Custom TCP | 8001 | Frontend SG / Backend SG | AI API access |
| HTTP | 80 | 0.0.0.0/0 | Nginx proxy |

> **Where to find**: AWS Console > EC2 > Network & Security > Security Groups

### 3.4 Allocate Elastic IPs (Recommended)

Elastic IPs prevent your public IP from changing when instances restart.

1. Go to **EC2 > Network & Security > Elastic IPs**
2. Click **Allocate Elastic IP address** (do this 3 times)
3. Associate each Elastic IP with one of your EC2 instances

---

## 4. Directory Structure

```
deploy/
├── README.md                          # This documentation
├── deploy_all.sh                      # Master script: deploys all 3 services from local machine
├── setup_backend.sh                   # Runs ON the Backend EC2 instance
├── setup_frontend.sh                  # Runs ON the Frontend EC2 instance
├── setup_ai_matching.sh               # Runs ON the AI Matching EC2 instance
└── env_templates/
    ├── backend.env.template           # Template for PythonProject/.env
    ├── frontend.env.template          # Template for frontend/.env
    └── ai_matching.env.template       # Template for ai_matching/.env
```

### What Each Script Does

| Script | Runs On | What It Does |
|--------|---------|-------------|
| `deploy_all.sh` | **Your local machine** | Uploads code via SCP/rsync to all 3 EC2 instances, then SSHs in and runs the individual setup scripts |
| `setup_backend.sh` | **Backend EC2** | Installs Python 3, creates venv, installs pip packages, creates systemd service (`praktiki-backend`), configures Nginx reverse proxy, enables UFW firewall |
| `setup_frontend.sh` | **Frontend EC2** | Installs Node.js 20, runs `npm ci && npm run build`, configures Nginx to serve `dist/` as SPA, enables gzip compression and cache headers |
| `setup_ai_matching.sh` | **AI Matching EC2** | Installs Python 3, creates 4 GB swap file (for ML models), creates venv, installs ML packages, pre-downloads `all-MiniLM-L6-v2` model, creates systemd service (`praktiki-ai-matching`) with memory limits |

---

## 5. EC2 Instance Setup

### 5.1 SSH into Your Instances

From your local terminal:

```bash
# Frontend
ssh -i praktiki-key.pem ubuntu@<FRONTEND_IP>

# Backend
ssh -i praktiki-key.pem ubuntu@<BACKEND_IP>

# AI Matching
ssh -i praktiki-key.pem ubuntu@<AI_MATCHING_IP>
```

> Replace `<FRONTEND_IP>`, `<BACKEND_IP>`, `<AI_MATCHING_IP>` with your actual EC2 public IPs.

### 5.2 System Packages Installed by Scripts

Each setup script automatically installs these via `apt-get`:

| Package | Installed On | Purpose |
|---------|-------------|---------|
| `python3`, `python3-pip`, `python3-venv` | Backend, AI Matching | Python runtime & package management |
| `build-essential`, `python3-dev` | Backend, AI Matching | Compiling native Python extensions |
| `libpq-dev` | Backend | PostgreSQL client library (for `psycopg2`) |
| `nodejs` (v20) | Frontend | JavaScript runtime for building React app |
| `nginx` | All 3 | Web server / reverse proxy |
| `supervisor` | Backend, AI Matching | Process monitoring (backup option) |
| `curl`, `git`, `htop`, `unzip` | All 3 | Utilities |

---

## 6. Deployment Methods

### Method A: Automated (Recommended) - deploy_all.sh

This script runs from **your local machine** and handles everything.

**Step 1**: Edit `deploy/deploy_all.sh` and set your values:

```bash
SSH_KEY_PATH="./praktiki-key.pem"       # Path to your .pem file
BACKEND_HOST="13.232.xxx.xxx"           # Backend EC2 public IP
AI_MATCHING_HOST="13.233.xxx.xxx"       # AI Matching EC2 public IP
FRONTEND_HOST="13.234.xxx.xxx"          # Frontend EC2 public IP
SSH_USER="ubuntu"                       # Default EC2 Ubuntu user
```

**Step 2**: Run the script:

```bash
chmod +x deploy/deploy_all.sh
./deploy/deploy_all.sh
```

**What happens behind the scenes:**

1. Validates SSH key and IP addresses
2. Uploads `PythonProject/` to Backend EC2 via SCP
3. Uploads `ai_matching/` to AI Matching EC2 via SCP
4. Uploads `frontend/` to Frontend EC2 via rsync (excludes `node_modules/` and `dist/`)
5. Auto-generates `frontend/.env` with correct Backend/AI Matching IPs
6. SSHs into each instance and runs the corresponding `setup_*.sh` script with sudo
7. Runs health checks on all three services

### Method B: Manual (Per Instance)

#### Deploy Backend

```bash
# From your local machine:
scp -i praktiki-key.pem -r ./PythonProject ubuntu@<BACKEND_IP>:/home/ubuntu/
scp -i praktiki-key.pem -r ./deploy ubuntu@<BACKEND_IP>:/home/ubuntu/

# SSH into the backend instance:
ssh -i praktiki-key.pem ubuntu@<BACKEND_IP>

# On the EC2 instance:
chmod +x /home/ubuntu/deploy/setup_backend.sh
sudo /home/ubuntu/deploy/setup_backend.sh
```

#### Deploy AI Matching

```bash
# From your local machine:
scp -i praktiki-key.pem -r ./ai_matching ubuntu@<AI_MATCHING_IP>:/home/ubuntu/
scp -i praktiki-key.pem -r ./deploy ubuntu@<AI_MATCHING_IP>:/home/ubuntu/

# SSH into the AI matching instance:
ssh -i praktiki-key.pem ubuntu@<AI_MATCHING_IP>

# On the EC2 instance:
chmod +x /home/ubuntu/deploy/setup_ai_matching.sh
sudo /home/ubuntu/deploy/setup_ai_matching.sh
```

#### Deploy Frontend

```bash
# From your local machine:
rsync -avz --exclude 'node_modules' --exclude 'dist' \
    -e "ssh -i praktiki-key.pem" \
    ./frontend/ ubuntu@<FRONTEND_IP>:/home/ubuntu/frontend/
scp -i praktiki-key.pem -r ./deploy ubuntu@<FRONTEND_IP>:/home/ubuntu/

# SSH into the frontend instance:
ssh -i praktiki-key.pem ubuntu@<FRONTEND_IP>

# On the EC2 instance:
# FIRST: create/edit /home/ubuntu/frontend/.env with correct API URLs
chmod +x /home/ubuntu/deploy/setup_frontend.sh
sudo /home/ubuntu/deploy/setup_frontend.sh
```

---

## 7. Environment Configuration

After deployment, the setup scripts create default `.env` files on each instance. You **must** SSH into each instance and update these with your actual production values.

### 7.1 Backend `.env` (PythonProject/.env)

Template located at: `deploy/env_templates/backend.env.template`

SSH into the Backend EC2 and edit:
```bash
nano /home/ubuntu/PythonProject/.env
```

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/praktiki

# JWT Configuration (generate with: openssl rand -hex 32)
JWT_SECRET=CHANGE_THIS_TO_A_SECURE_RANDOM_STRING
JWT_EXPIRATION_MINUTES=60

# Application Settings
DEBUG=false
ENVIRONMENT=production
API_HOST=0.0.0.0
API_PORT=8000

# CORS - comma-separated allowed origins
CORS_ORIGINS=http://your-frontend-domain.com,http://FRONTEND_EC2_IP

# Email (optional)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password

# AWS S3 (optional, for file uploads)
# AWS_ACCESS_KEY_ID=your_access_key
# AWS_SECRET_ACCESS_KEY=your_secret_key
# AWS_REGION=ap-south-1
# S3_BUCKET_NAME=praktiki-uploads
```

After editing, restart the service:
```bash
sudo systemctl restart praktiki-backend
```

### 7.2 Frontend `.env` (frontend/.env)

Template located at: `deploy/env_templates/frontend.env.template`

> **Important**: Vite requires the `VITE_` prefix for environment variables to be accessible in the browser.

SSH into the Frontend EC2 and edit:
```bash
nano /home/ubuntu/frontend/.env
```

```env
# API URLs (use public IPs or domain names)
VITE_API_URL=http://BACKEND_EC2_PUBLIC_IP:8000
VITE_AI_MATCHING_URL=http://AI_MATCHING_EC2_PUBLIC_IP:8001

# App Configuration
VITE_APP_NAME=Praktiki
VITE_APP_VERSION=1.0.0
```

> **Note**: After changing `.env` in the frontend, you must **rebuild** for changes to take effect since Vite bakes env vars into the static build at compile time:
> ```bash
> cd /home/ubuntu/frontend && npm run build
> ```

### 7.3 AI Matching `.env` (ai_matching/.env)

Template located at: `deploy/env_templates/ai_matching.env.template`

SSH into the AI Matching EC2 and edit:
```bash
nano /home/ubuntu/ai_matching/.env
```

```env
# Backend API URL (use private IP if in same VPC for lower latency)
BACKEND_API_URL=http://BACKEND_PRIVATE_IP:8000
API_PORT=8001

# ML Model Configuration
MODEL_CACHE_DIR=/home/ubuntu/ai_matching/model_cache
TRANSFORMER_MODEL=all-MiniLM-L6-v2

# Application Settings
DEBUG=false
ENVIRONMENT=production
WORKERS=2

# Matching Tuning
MAX_RERANK_CANDIDATES=10
MATCH_THRESHOLD=0.5
```

After editing, restart the service:
```bash
sudo systemctl restart praktiki-ai-matching
```

---

## 8. Service Management

### Systemd Services Created

| Service Name | Instance | Managed By | Config Location |
|-------------|----------|------------|-----------------|
| `praktiki-backend` | Backend EC2 | systemd | `/etc/systemd/system/praktiki-backend.service` |
| `praktiki-ai-matching` | AI Matching EC2 | systemd | `/etc/systemd/system/praktiki-ai-matching.service` |
| `nginx` | All 3 instances | systemd | `/etc/nginx/sites-available/` |

### Common Commands

```bash
# Check status
sudo systemctl status praktiki-backend
sudo systemctl status praktiki-ai-matching
sudo systemctl status nginx

# Restart a service
sudo systemctl restart praktiki-backend
sudo systemctl restart praktiki-ai-matching
sudo systemctl restart nginx

# Stop a service
sudo systemctl stop praktiki-backend

# Start a service
sudo systemctl start praktiki-backend

# Enable service to start on boot
sudo systemctl enable praktiki-backend

# Reload systemd after editing .service files
sudo systemctl daemon-reload
```

### Process Details

**Backend** runs as:
```
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```
- 4 Gunicorn workers, each running Uvicorn (async)
- Logs: `/var/log/praktiki-backend/access.log` and `error.log`

**AI Matching** runs as:
```
gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001 --timeout 120
```
- 2 workers (limited by memory due to ML models)
- 120s timeout for ML inference
- Memory limits: `MemoryMax=3G`, `MemoryHigh=2G`
- Logs: `/var/log/praktiki-ai-matching/access.log` and `error.log`

**Frontend** runs as:
- Static files served by Nginx from `/home/ubuntu/frontend/dist/`
- SPA routing configured (`try_files $uri $uri/ /index.html`)
- Gzip compression enabled
- Static asset caching: 1 year with `immutable` header

---

## 9. Post-Deployment Verification

### Health Checks

After deployment, verify each service is running:

```bash
# Backend API (from any machine)
curl http://<BACKEND_IP>:8000/
curl http://<BACKEND_IP>:8000/docs     # Swagger UI

# AI Matching API
curl http://<AI_MATCHING_IP>:8001/
curl http://<AI_MATCHING_IP>:8001/docs  # Swagger UI

# Frontend
curl http://<FRONTEND_IP>/
```

### Expected Responses

| URL | Expected Status | Notes |
|-----|----------------|-------|
| `http://BACKEND_IP:8000/` | 200 OK | JSON response |
| `http://BACKEND_IP:8000/docs` | 200 OK | Interactive Swagger documentation |
| `http://AI_MATCHING_IP:8001/` | 200 OK | May take 10-30s on first request (model loading) |
| `http://FRONTEND_IP/` | 200 OK | HTML page (React app) |

### Service URLs After Deployment

```
Frontend:               http://<FRONTEND_IP>
Backend API:            http://<BACKEND_IP>:8000
Backend Swagger Docs:   http://<BACKEND_IP>:8000/docs
AI Matching API:        http://<AI_MATCHING_IP>:8001
AI Matching Docs:       http://<AI_MATCHING_IP>:8001/docs
```

---

## 10. SSL/HTTPS Setup

After basic deployment works, secure your services with HTTPS using Let's Encrypt (free SSL certificates).

> **Prerequisite**: You must have a domain name pointing to your EC2 IP (e.g., `praktiki.com`, `api.praktiki.com`).

### On Each Instance:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain and install certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com

# Auto-renewal is configured automatically. Test it:
sudo certbot renew --dry-run
```

> **Where to get a domain**: [Namecheap](https://www.namecheap.com), [GoDaddy](https://www.godaddy.com), [Google Domains](https://domains.google), or use [AWS Route 53](https://aws.amazon.com/route53/).

---

## 11. Monitoring & Logs

### Application Logs

```bash
# Backend - real-time logs
sudo journalctl -u praktiki-backend -f

# Backend - last 100 lines
sudo journalctl -u praktiki-backend -n 100

# AI Matching - real-time logs
sudo journalctl -u praktiki-ai-matching -f

# Nginx access/error logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Service-specific logs
sudo tail -f /var/log/praktiki-backend/access.log
sudo tail -f /var/log/praktiki-backend/error.log
sudo tail -f /var/log/praktiki-ai-matching/access.log
sudo tail -f /var/log/praktiki-ai-matching/error.log
```

### System Monitoring

```bash
# CPU, memory, processes
htop

# Disk usage
df -h

# Check swap usage (important for AI Matching)
free -h

# Check which ports are in use
sudo ss -tlnp
```

### Optional: AWS CloudWatch

For centralized monitoring, set up [AWS CloudWatch](https://aws.amazon.com/cloudwatch/):

1. Install the CloudWatch agent on each instance
2. Configure metrics collection (CPU, memory, disk)
3. Set up alarms for high CPU or low disk space

> **Where to find**: AWS Console > CloudWatch > Metrics

---

## 12. Troubleshooting

### Service Won't Start

```bash
# Check service status and error output
sudo systemctl status praktiki-backend

# View detailed logs
sudo journalctl -u praktiki-backend -n 50 --no-pager

# Common fix: check .env file exists and has correct values
cat /home/ubuntu/PythonProject/.env

# Common fix: check permissions
ls -la /home/ubuntu/PythonProject/
```

### Port Already in Use

```bash
# Find what's using a port
sudo ss -tlnp | grep 8000

# Kill the process if needed
sudo kill -9 <PID>
```

### AI Matching Out of Memory

```bash
# Check memory usage
free -h

# Verify swap is active
swapon --show

# If no swap, create one:
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

> **Tip**: If the AI Matching instance repeatedly runs out of memory, upgrade to `t2.medium` (4 GB RAM) or `t2.large` (8 GB RAM).

### Frontend Shows Blank Page

```bash
# Check if build succeeded
ls -la /home/ubuntu/frontend/dist/

# Rebuild if needed
cd /home/ubuntu/frontend
npm run build

# Check Nginx config
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

### CORS Errors in Browser

Update the backend `.env` with the correct frontend URL:

```env
CORS_ORIGINS=http://FRONTEND_EC2_IP,http://yourdomain.com
```

Then restart the backend:

```bash
sudo systemctl restart praktiki-backend
```

### Cannot Connect to Database

```bash
# Test PostgreSQL connection
psql -U user -h localhost -d praktiki

# Check if PostgreSQL is running
sudo systemctl status postgresql

# If using AWS RDS, ensure the security group allows inbound from the Backend EC2
```

### Frontend Not Hitting API

1. Open browser DevTools (F12) > Console/Network tab
2. Check if requests go to the correct backend IP
3. Verify `frontend/.env` has correct `VITE_API_URL` and `VITE_AI_MATCHING_URL`
4. **Rebuild** the frontend after changing `.env`:

```bash
cd /home/ubuntu/frontend
npm run build
# No need to restart Nginx; it serves the new files automatically
```

---

## 13. Security Checklist

Before going to production, verify:

- [ ] **SSH key** is stored securely; `.pem` file is not committed to git
- [ ] **JWT_SECRET** is a strong random string (generate with `openssl rand -hex 32`)
- [ ] **Database password** is strong and not the default
- [ ] **DEBUG=false** in all production `.env` files
- [ ] **Security Groups** restrict SSH (port 22) to your IP only
- [ ] **UFW firewall** is enabled on all instances (setup scripts do this)
- [ ] **HTTPS** is configured with Let's Encrypt certificates
- [ ] **CORS_ORIGINS** only lists your actual frontend domain
- [ ] **Elastic IPs** are associated (so IPs don't change on reboot)
- [ ] `.env` files are **not** committed to git (check `.gitignore`)
- [ ] **Regular OS updates**: `sudo apt update && sudo apt upgrade` periodically

### Recommended AWS Best Practices

- Use **IAM roles** instead of hardcoding AWS credentials
- Store secrets in **AWS Secrets Manager** or **SSM Parameter Store**
- Enable **AWS CloudTrail** for audit logging
- Set up **automated backups** for your database (RDS does this automatically)
- Use **private subnets** for backend/AI services, with only the frontend in a public subnet

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPLOYMENT QUICK REFERENCE                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  DEPLOY ALL:     ./deploy/deploy_all.sh                          │
│                                                                  │
│  SSH:            ssh -i key.pem ubuntu@<IP>                      │
│                                                                  │
│  STATUS:         sudo systemctl status praktiki-backend          │
│                  sudo systemctl status praktiki-ai-matching      │
│                  sudo systemctl status nginx                     │
│                                                                  │
│  RESTART:        sudo systemctl restart praktiki-backend         │
│                  sudo systemctl restart praktiki-ai-matching     │
│                  sudo systemctl restart nginx                    │
│                                                                  │
│  LOGS:           sudo journalctl -u praktiki-backend -f          │
│                  sudo journalctl -u praktiki-ai-matching -f      │
│                  sudo tail -f /var/log/nginx/error.log           │
│                                                                  │
│  REBUILD FE:     cd /home/ubuntu/frontend && npm run build       │
│                                                                  │
│  SWAGGER DOCS:   http://<BACKEND_IP>:8000/docs                   │
│                  http://<AI_MATCHING_IP>:8001/docs                │
│                                                                  │
│  ENV TEMPLATES:  deploy/env_templates/*.env.template             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```
