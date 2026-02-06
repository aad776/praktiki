# AWS EC2 Deployment Scripts for Praktiki

This directory contains deployment scripts for deploying the Praktiki platform on AWS EC2 instances.

## Architecture Overview

The platform consists of three services, each deployed on a separate EC2 instance:

| Service | Directory | Port | Description |
|---------|-----------|------|-------------|
| **Backend API** | `PythonProject` | 8000 | FastAPI main backend with PostgreSQL |
| **AI Matching** | `ai_matching` | 8001 | FastAPI AI matching service |
| **Frontend** | `frontend` | 80/443 | Vite React application |

## Prerequisites

### AWS Setup
1. Three EC2 instances (Ubuntu 22.04 LTS recommended):
   - **Instance 1**: Backend API (t2.micro or larger)
   - **Instance 2**: AI Matching (t2.medium or larger - needs RAM for ML models)
   - **Instance 3**: Frontend (t2.micro)

2. Security Groups configured:
   - Backend: Allow inbound on ports 22 (SSH), 8000 (API)
   - AI Matching: Allow inbound on ports 22 (SSH), 8001 (API)
   - Frontend: Allow inbound on ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

3. Key pair (.pem file) for SSH access

### Environment Variables
Before deploying, update the `.env` files on each instance with production values.

## Deployment Steps

### 1. Upload Code to EC2 Instances

From your local machine, use SCP to upload code:

```bash
# Upload Backend
scp -i your-key.pem -r ./PythonProject ubuntu@<BACKEND_IP>:/home/ubuntu/

# Upload AI Matching
scp -i your-key.pem -r ./ai_matching ubuntu@<AI_MATCHING_IP>:/home/ubuntu/

# Upload Frontend
scp -i your-key.pem -r ./frontend ubuntu@<FRONTEND_IP>:/home/ubuntu/
```

### 2. Run Setup Scripts

SSH into each instance and run the corresponding setup script:

```bash
# On Backend Instance
chmod +x /home/ubuntu/deploy/setup_backend.sh
sudo /home/ubuntu/deploy/setup_backend.sh

# On AI Matching Instance
chmod +x /home/ubuntu/deploy/setup_ai_matching.sh
sudo /home/ubuntu/deploy/setup_ai_matching.sh

# On Frontend Instance
chmod +x /home/ubuntu/deploy/setup_frontend.sh
sudo /home/ubuntu/deploy/setup_frontend.sh
```

## Quick Deploy (All-in-One)

Use the master deploy script from your local machine:

```bash
chmod +x deploy/deploy_all.sh
./deploy/deploy_all.sh
```

## Service Management

### Check Service Status
```bash
sudo systemctl status praktiki-backend
sudo systemctl status praktiki-ai-matching
sudo systemctl status nginx
```

### Restart Services
```bash
sudo systemctl restart praktiki-backend
sudo systemctl restart praktiki-ai-matching
sudo systemctl restart nginx
```

### View Logs
```bash
sudo journalctl -u praktiki-backend -f
sudo journalctl -u praktiki-ai-matching -f
sudo tail -f /var/log/nginx/error.log
```

## Environment Configuration

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your_production_secret_key
```

### AI Matching (.env) - if needed
```
API_URL=http://<BACKEND_PRIVATE_IP>:8000
```

### Frontend (.env)
```
VITE_API_URL=http://<BACKEND_PUBLIC_IP>:8000
VITE_AI_MATCHING_URL=http://<AI_MATCHING_PUBLIC_IP>:8001
VITE_APP_NAME=Praktiki
VITE_APP_VERSION=1.0.0
```

## Security Recommendations

1. Use private IPs for inter-service communication
2. Set up HTTPS with Let's Encrypt for production
3. Use AWS Secrets Manager for sensitive credentials
4. Configure proper firewall rules (UFW)
5. Set up monitoring with CloudWatch
