---
description: Deploy the entire Praktiki project (Backend, AI Matching + Resume Parser, Frontend) and ABC-Portal to all three EC2 instances
---

# Deploy Praktiki + ABC-Portal to All EC2 Instances

This workflow deploys the full platform across **three EC2 instances** (six services):

| Service | Source Directory | EC2 Host | Port |
|---------|-----------------|----------|------|
| **Praktiki Backend** | `PythonProject/` | `44.205.136.199` | 8000 |
| **ABC Portal Backend** | `ABC-Portal/` | `44.205.136.199` | 8003 |
| **AI Matching** | `ai_matching/` | `52.205.225.84` | 8001 |
| **Resume Parser** | `ai_matching/resume_parser/` | `52.205.225.84` | 8002 |
| **Praktiki Frontend** | `frontend/` | `44.197.97.159` | 80 |
| **ABC Portal Frontend** | `ABC-Portal/frontend/` | `44.197.97.159` | 3000 |

> **SSH Key**: `prakritii.pem` located at project root
> **SSH User**: `ubuntu`

---

## Prerequisites

1. **SSH key file exists** at the project root (`prakritii.pem`).
2. **All three EC2 instances are running**.
3. **Security groups** allow: SSH (22), HTTP (80), and ports **8000, 8001, 8002, 8003, 3000**.
4. **Environment `.env` files** are ready with production values.

---

## Automated Deployment (Recommended)

### Step 1 — Verify EC2 IPs

Open `deploy/deploy_all.sh` and confirm the IP variables.

### Step 2 — Run from Git Bash

```bash
cd /c/Users/karti/computer_science/praktiki
chmod +x deploy/deploy_all.sh
./deploy/deploy_all.sh
```

### Step 3 — Confirm all 6 services are responding

- ✅ Praktiki Backend (port 8000)
- ✅ ABC Portal Backend (port 8003)
- ✅ AI Matching (port 8001)
- ✅ Resume Parser (port 8002)
- ✅ Praktiki Frontend (port 80)
- ✅ ABC Portal Frontend (port 3000)

---

## Service URLs After Deployment

| Service | URL |
|---------|-----|
| Praktiki Frontend | http://44.197.97.159 |
| ABC Portal Frontend | http://44.197.97.159:3000 |
| Praktiki Backend API | http://44.205.136.199:8000 |
| Praktiki Swagger Docs | http://44.205.136.199:8000/docs |
| ABC Portal Backend API | http://44.205.136.199:8003 |
| ABC Portal Swagger Docs | http://44.205.136.199:8003/docs |
| AI Matching API | http://52.205.225.84:8001 |
| AI Matching Swagger | http://52.205.225.84:8001/docs |
| Resume Parser API | http://52.205.225.84:8002 |
| Resume Parser Swagger | http://52.205.225.84:8002/docs |

---

## Architecture After Deployment

```
EC2: 44.205.136.199 (Backend)
  ├── praktiki-backend     → port 8000 (Gunicorn + 4 Uvicorn workers)
  └── abc-portal-backend   → port 8003 (Gunicorn + 2 Uvicorn workers)

EC2: 52.205.225.84 (AI Matching)
  ├── praktiki-ai-matching    → port 8001 (Gunicorn + 2 Uvicorn workers)
  └── praktiki-resume-parser  → port 8002 (Gunicorn + 2 Uvicorn workers)

EC2: 44.197.97.159 (Frontend)
  ├── Nginx :80    → Praktiki Frontend (static)
  └── Nginx :3000  → ABC Portal Frontend (static)
```

---

## Common Service Management Commands

```bash
# Backend EC2 (44.205.136.199)
sudo systemctl status praktiki-backend
sudo systemctl status abc-portal-backend
sudo systemctl restart praktiki-backend
sudo systemctl restart abc-portal-backend
sudo journalctl -u praktiki-backend -f
sudo journalctl -u abc-portal-backend -f

# AI Matching EC2 (52.205.225.84)
sudo systemctl status praktiki-ai-matching
sudo systemctl status praktiki-resume-parser
sudo systemctl restart praktiki-ai-matching
sudo systemctl restart praktiki-resume-parser
sudo journalctl -u praktiki-ai-matching -f
sudo journalctl -u praktiki-resume-parser -f

# Frontend EC2 (44.197.97.159)
sudo systemctl status nginx
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/error.log
```

---

## Quick Redeployment (Code Update Only)

### Praktiki Backend
```bash
scp -i prakritii.pem -r ./PythonProject ubuntu@44.205.136.199:/home/ubuntu/
ssh -i prakritii.pem ubuntu@44.205.136.199 "cd /home/ubuntu/PythonProject && source venv/bin/activate && pip install -r requirements.txt && sudo systemctl restart praktiki-backend"
```

### ABC Portal Backend
```bash
scp -i prakritii.pem -r ./ABC-Portal ubuntu@44.205.136.199:/home/ubuntu/
ssh -i prakritii.pem ubuntu@44.205.136.199 "cd /home/ubuntu/ABC-Portal && source venv/bin/activate && pip install -r requirements.txt && sudo systemctl restart abc-portal-backend"
```

### AI Matching
```bash
scp -i prakritii.pem -r ./ai_matching ubuntu@52.205.225.84:/home/ubuntu/
ssh -i prakritii.pem ubuntu@52.205.225.84 "cd /home/ubuntu/ai_matching && source venv/bin/activate && pip install -r requirements.txt && sudo systemctl restart praktiki-ai-matching"
```

### Resume Parser
```bash
scp -i prakritii.pem -r ./ai_matching/resume_parser ubuntu@52.205.225.84:/home/ubuntu/ai_matching/
ssh -i prakritii.pem ubuntu@52.205.225.84 "cd /home/ubuntu/ai_matching/resume_parser && source venv/bin/activate && pip install -r requirements.txt && sudo systemctl restart praktiki-resume-parser"
```

### Praktiki Frontend
```bash
rsync -avz --exclude 'node_modules' --exclude 'dist' \
    -e "ssh -i prakritii.pem" \
    ./frontend/ ubuntu@44.197.97.159:/home/ubuntu/frontend/
ssh -i prakritii.pem ubuntu@44.197.97.159 "cd /home/ubuntu/frontend && npm ci && npm run build"
```

### ABC Portal Frontend
```bash
rsync -avz --exclude 'node_modules' --exclude 'dist' \
    -e "ssh -i prakritii.pem" \
    ./ABC-Portal/frontend/ ubuntu@44.197.97.159:/home/ubuntu/abc-frontend/
ssh -i prakritii.pem ubuntu@44.197.97.159 "cd /home/ubuntu/abc-frontend && npm ci && npm run build"
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Service won't start | `sudo journalctl -u <service-name> -n 50 --no-pager` |
| Port already in use | `sudo ss -tlnp \| grep <port>`, then `sudo kill -9 <PID>` |
| AI Matching out of memory | Verify swap: `swapon --show`, upgrade to `t2.medium`+ |
| Frontend blank page | Check `ls /home/ubuntu/frontend/dist/`, rebuild: `npm run build` |
| CORS errors | Update CORS origins in backend code, restart service |
| Frontend not hitting API | Verify `.env` URLs, **rebuild** frontend |
| Port blocked externally | Add the port to EC2 security group in AWS Console |
| EC2 IP changed | Allocate **Elastic IPs** in AWS Console |
