# Praktiki Production Specification

**Version:** 2.0  
**Last updated:** 2026-02-09  
**Status:** Living document — update after every production change

---

## Table of Contents

1. [Purpose and Scope](#1-purpose-and-scope)
2. [System Overview](#2-system-overview)
3. [Architecture and Network Layout](#3-architecture-and-network-layout)
4. [Component Specifications](#4-component-specifications)
5. [Deployment Specification](#5-deployment-specification)
6. [Configuration and Environment Variables](#6-configuration-and-environment-variables)
7. [Data Storage and Persistence](#7-data-storage-and-persistence)
8. [Security](#8-security)
9. [Observability and Monitoring](#9-observability-and-monitoring)
10. [Operational Runbook](#10-operational-runbook)
11. [Capacity, Scaling, and Performance](#11-capacity-scaling-and-performance)
12. [Backup, Recovery, and Disaster Recovery](#12-backup-recovery-and-disaster-recovery)
13. [Incident Response](#13-incident-response)
14. [Testing and Verification](#14-testing-and-verification)
15. [Production Readiness Assessment](#15-production-readiness-assessment)
16. [Remediation Roadmap](#16-remediation-roadmap)
17. [Appendix](#17-appendix)

---

## 1. Purpose and Scope

This document specifies how the Praktiki platform is deployed, configured, and operated in production. It serves as the single source of truth for infrastructure, runtime behavior, operational procedures, and production readiness status.

### 1.1 Audience

| Audience | Use |
| --- | --- |
| Engineering team | Day-to-day reference for deployment, debugging, and configuration |
| DevOps / SRE | Operational runbook, monitoring, incident response |
| Technical leads | Architecture decisions, capacity planning, security review |
| New team members | Onboarding reference for understanding production topology |

### 1.2 In Scope

- Production deployment topology and runtime configuration
- All environment variables (required, optional, and unused template-only)
- Data storage, persistence, and retention
- Security controls implemented in code and infrastructure
- Operational procedures, health checks, and troubleshooting
- Production readiness gaps with prioritized remediation

### 1.3 Out of Scope

- Product requirements and roadmap (see `REQUIREMENTS_ANALYSIS.md`)
- Full API request/response reference (see `API_DOCUMENTATION.md`)
- UI/UX design and visual specifications
- Feature comparison and gap analysis (see `API_DOCUMENTATION.md`, Internshala comparison section)

### 1.4 Glossary

| Term | Definition |
| --- | --- |
| **APAAR ID** | Automated Permanent Academic Account Registry — a 12-digit government-issued student identity number |
| **AISHE Code** | All India Survey on Higher Education code — unique identifier for educational institutions |
| **SPA** | Single-Page Application |
| **JWT** | JSON Web Token — used for stateless authentication |
| **Hybrid Matching** | AI recommendation approach combining rule-based scoring, sentence embeddings, and cross-encoder reranking |

### 1.5 Related Documents

| Document | Path | Description |
| --- | --- | --- |
| API Documentation | `API_DOCUMENTATION.md` | Endpoint reference with request/response schemas |
| Deployment Guide | `deploy/README.md` | Step-by-step deployment instructions |
| Requirements Analysis | `REQUIREMENTS_ANALYSIS.md` | Product requirements and feature roadmap |
| Env Templates | `deploy/env_templates/*.env.template` | Environment variable templates per service |

---

## 2. System Overview

Praktiki is a campus-to-career placement and internship ecosystem built as a three-service architecture deployed on separate AWS EC2 instances.

### 2.1 Service Summary

| Service | Technology | Purpose |
| --- | --- | --- |
| **Frontend** | React 18 + Vite 5 + TypeScript + Tailwind CSS | SPA served as static files by Nginx |
| **Backend API** | FastAPI + SQLAlchemy + PostgreSQL | Authentication, business logic, data access |
| **AI Matching** | FastAPI + Sentence Transformers + PyTorch | ML-based internship recommendations |

### 2.2 Service Responsibilities

- **Frontend:** UI rendering, client-side routing, authentication state management (localStorage), API calls to backend via `fetch`. Does not communicate directly with the AI Matching service.
- **Backend API:** User authentication (JWT), profile management (student, employer, institute), internship posting, application lifecycle, email notifications (optional SMTP), and an embedded AI fallback adapter.
- **AI Matching:** Standalone recommendation pipeline using sentence embeddings (`all-MiniLM-L6-v2`), hybrid rule-based + embedding scoring, cross-encoder reranking, and a feedback loop for continuous improvement. Currently loads data from static JSON files rather than the live database.

### 2.3 Core User Flows

**Student:**
```
Sign Up → Log In → Create Profile → (Optional) Upload Resume → Browse Internships
  → Apply → Receive AI Recommendations → Provide Feedback
```

**Employer:**
```
Sign Up → Complete Profile (verification gate) → Post Internships
  → View Applications → Update Application Status (→ triggers email notification)
```

**Institute:**
```
Sign Up → View Enrolled Students and Their Internship Activity (read-only)
```

### 2.4 External Dependencies

| Dependency | Role | Required |
| --- | --- | --- |
| PostgreSQL | Primary relational data store | Yes |
| Nginx | Static file hosting and reverse proxy | Yes |
| Python 3 | Backend and AI service runtime | Yes |
| Node.js 20 LTS | Frontend build toolchain | Yes (build-time only) |
| SMTP server | Email verification and notifications | No (degrades gracefully) |
| Sentence Transformers model | AI embeddings (`all-MiniLM-L6-v2`) | Yes (for AI service) |
| PyTorch | ML model execution runtime | Yes (for AI service) |

---

## 3. Architecture and Network Layout

### 3.1 Services and Ports

| Service | Source Path | Internal Port | Public Port | Process Manager | Workers |
| --- | --- | --- | --- | --- | --- |
| Frontend | `frontend/` | N/A (static) | 80 / 443 | Nginx | N/A |
| Backend API | `PythonProject/` | 8000 | 80 / 443 | Gunicorn + Uvicorn | 4 |
| AI Matching | `ai_matching/` | 8001 | 80 / 443 | Gunicorn + Uvicorn | 2 |

### 3.2 Data Flow

```
┌──────────┐     HTTPS      ┌──────────────┐
│  Browser  │ ──────────────►│   Frontend   │
│           │◄──────────────│  (Nginx SPA) │
└──────────┘                └──────────────┘
     │
     │ HTTPS (VITE_API_URL)
     ▼
┌──────────────┐            ┌──────────────┐
│  Backend API │            │  PostgreSQL   │
│  (FastAPI)   │───────────►│  (Database)   │
│              │◄───────────│              │
└──────────────┘            └──────────────┘
     │
     │ In-process import (fallback)
     ▼
┌──────────────┐
│  AI Matching │  ◄── Standalone service on separate instance
│  (FastAPI)   │      Also importable as library by backend
└──────────────┘
```

**Key data flow notes:**

1. Browser requests static assets from the Frontend Nginx server.
2. Frontend SPA makes API calls to Backend using `VITE_API_URL` (baked at build time).
3. Backend accesses PostgreSQL via SQLAlchemy ORM.
4. AI Matching operates in two modes:
   - **Standalone service** (`ai_matching/`) with its own HTTP API on port 8001.
   - **Embedded library** imported by backend (`PythonProject/services/ai_service.py`) with in-memory caching (24-hour TTL). Falls back to basic skill-matching if AI dependencies are unavailable.
5. Frontend does **not** call AI Matching directly — there is no `VITE_AI_MATCHING_URL` usage in the frontend code, despite the template including it.
6. Authentication tokens (JWT) are issued by the backend and stored in `localStorage` on the client.

### 3.3 Request Lifecycle

```
Client Request
  → Nginx (TLS termination, static asset caching, reverse proxy)
    → Gunicorn (process manager, worker management)
      → Uvicorn (ASGI server)
        → FastAPI (routing, middleware, dependency injection)
          → CORS middleware check
          → HTTP logging middleware (logs method, URL, status)
          → Route handler
            → OAuth2 bearer token extraction
            → JWT decode + user lookup
            → Role enforcement (student / employer / institute / admin)
            → Pydantic request validation
            → SQLAlchemy database operations
          → JSON response
```

### 3.4 Nginx Configuration Details

**Frontend Nginx** (`deploy/setup_frontend.sh`):
- Serves `/home/ubuntu/frontend/dist` as SPA with `try_files $uri $uri/ /index.html`
- Gzip enabled for text, CSS, JS, JSON, SVG, XML
- Static assets cached for 1 year with `immutable` header
- Security headers: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection: 1; mode=block`
- Health endpoint: `GET /health` returns `200 OK`

**Backend Nginx** (`deploy/setup_backend.sh`):
- Reverse proxies to `127.0.0.1:8000`
- `client_max_body_size 50M` (for resume file uploads)
- `proxy_read_timeout 300s`, `proxy_connect_timeout 75s`
- Proxy headers: `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `Host`
- Health endpoint: `GET /health` proxied to backend root

**AI Matching Nginx** (`deploy/setup_ai_matching.sh`):
- Reverse proxies to `127.0.0.1:8001`
- Extended timeouts for ML inference: `proxy_read_timeout 120s`, `proxy_connect_timeout 120s`
- Health endpoint: `GET /health` proxied to AI root

### 3.5 Network Security and Firewall

**UFW rules** (configured by all setup scripts):

| Port | Protocol | Service | Exposure |
| --- | --- | --- | --- |
| 22 | TCP | SSH | All instances |
| 80 | TCP | HTTP | All instances |
| 443 | TCP | HTTPS | All instances |
| 8000 | TCP | Backend direct | Backend only (optional) |
| 8001 | TCP | AI Matching direct | AI Matching only (optional) |

**AWS Security Group recommendations** (from `deploy/README.md`):

| Instance | Inbound Rules |
| --- | --- |
| Frontend | 22 (SSH), 80, 443 from `0.0.0.0/0` |
| Backend | 22 (SSH), 80, 8000 — restrict to Frontend SG or known IPs |
| AI Matching | 22 (SSH), 80, 8001 — restrict to Backend/Frontend SGs |

### 3.6 Internal Communication Paths

| From | To | Method | Variable |
| --- | --- | --- | --- |
| Frontend → Backend | HTTP/HTTPS | `VITE_API_URL` (build-time) |
| Backend → PostgreSQL | TCP/5432 | `DATABASE_URL` |
| Backend → AI Matching | In-process import | N/A (library, not HTTP) |
| AI Matching → Backend | Not used | `BACKEND_API_URL` defined but not actively called |

---

## 4. Component Specifications

### 4.1 Frontend (React + Vite + TypeScript)

**Entry point:** `frontend/src/main.tsx`

**Build toolchain:**

| Tool | Version | Purpose |
| --- | --- | --- |
| Vite | ^5.0.0 | Build tool and dev server |
| React | ^18.2.0 | UI framework |
| TypeScript | ^5.0.0 | Type-safe JavaScript |
| Tailwind CSS | ^3.4.0 | Utility-first CSS framework |
| `@vitejs/plugin-react-swc` | ^3.5.0 | SWC-based React fast refresh |
| PostCSS | ^8.4.0 | CSS processing |
| Autoprefixer | ^10.4.0 | CSS vendor prefixes |

**Runtime dependencies:**

| Package | Version | Purpose |
| --- | --- | --- |
| `react` | ^18.2.0 | UI rendering |
| `react-dom` | ^18.2.0 | DOM rendering |
| `react-router-dom` | ^6.21.0 | Client-side routing |
| `axios` | ^1.6.0 | HTTP client (included but `fetch` is used in api.ts) |
| `jwt-decode` | ^4.0.0 | JWT token decoding |
| `leaflet` | ^1.9.4 | Interactive maps |
| `react-leaflet` | ^4.2.1 | React bindings for Leaflet |
| `react-icons` | ^5.5.0 | Icon library |

**Build and deployment:**
- Build: `npm ci && npm run build` (outputs `frontend/dist/`)
- Nginx serves from `/home/ubuntu/frontend/dist`
- SPA routing: `try_files $uri $uri/ /index.html`

**Configuration** (`frontend/src/config/index.ts`):

```typescript
export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
    timeout: 30000,
  },
  app: {
    name: import.meta.env.VITE_APP_NAME || 'Praktiki',
    version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  },
  auth: {
    tokenKey: 'praktiki_token',
    userKey: 'praktiki_user',
    roleKey: 'praktiki_role',
  },
  features: {
    enableAnalytics: import.meta.env.PROD,
    enableDebugLogs: import.meta.env.DEV,
  },
}
```

**Client-side storage (localStorage):**

| Key | Purpose |
| --- | --- |
| `praktiki_token` | JWT access token |
| `praktiki_user` | Serialized user object |
| `praktiki_role` | User role string |

**API client behavior** (`frontend/src/services/api.ts`):
- Uses `fetch` (not axios) with `Authorization: Bearer <token>` header when a token exists.
- On `401` responses (except on `/auth/login`), clears all auth state from localStorage and redirects to `/login`.
- Logs request metadata to browser console.

### 4.2 Backend API (FastAPI + SQLAlchemy)

**Entry point:** `PythonProject/main.py`

**Runtime process:**
- **Systemd service:** `praktiki-backend`
- **Command:** `gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000`
- **Access logs:** `/var/log/praktiki-backend/access.log`
- **Error logs:** `/var/log/praktiki-backend/error.log`

**Python dependencies** (`PythonProject/requirements.txt`):

| Package | Purpose |
| --- | --- |
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `sqlalchemy` | ORM |
| `alembic` | Database migrations |
| `psycopg2-binary` | PostgreSQL driver |
| `python-jose[cryptography]` | JWT encoding/decoding |
| `passlib[bcrypt]` | Password hashing |
| `bcrypt` | Bcrypt backend |
| `python-multipart` | Form data and file upload parsing |
| `pydantic-settings` | Environment-based settings |
| `email-validator` | Email format validation |

> **Note:** Dependencies are unpinned (no version specifiers). This is a production risk — see [Section 15](#15-production-readiness-assessment).

**API route structure:**

| Prefix | Router | Description |
| --- | --- | --- |
| `/auth` | `api/v1/auth.py` | Registration, login, email/phone verification, password reset, OTP |
| `/students` | `api/v1/students.py` | Profile, resume, skills, applications, recommendations, feedback |
| `/employers` | `api/v1/employers.py` | Profile, internship posting, application management, dashboard metrics |
| `/institutes` | `api/v1/institutes.py` | View institute students (read-only) |

**Middleware stack** (applied in order):
1. **CORS middleware** — hard-coded localhost origins (see [Section 8.6](#86-known-security-gaps))
2. **HTTP logging middleware** — prints `method`, `URL`, and `status_code` to stdout

**Startup behavior** (`main.py`):
1. Calls `Base.metadata.create_all(bind=engine)` to auto-create missing tables.
2. Calls `ensure_optional_columns()` which dynamically adds columns to `employer_profiles`, `internships`, and `users` tables if they don't already exist (supports both SQLite and PostgreSQL dialects).

> **Warning:** Runtime schema modification can conflict with Alembic migration management. See [Section 15](#15-production-readiness-assessment).

**Authentication and authorization:**
- JWT issuance: `PythonProject/utils/security.py`
- OAuth2 bearer extraction: `PythonProject/utils/dependencies.py`
- Role enforcement dependencies:
  - `get_current_user` — validates JWT, returns `User` object
  - `get_current_student` — ensures `role == "student"`
  - `get_current_employer` — ensures `role == "employer"`
  - `get_current_admin` — ensures `role == "admin"`
  - `require_role(allowed_roles)` — factory for arbitrary role lists
  - `require_verified_employer` — validates employer profile completeness (company_name, contact_number, designation, city, industry must be non-empty). Email/phone verification check is **currently commented out**.

**Email sending** (`PythonProject/utils/email.py`):
- SMTP settings are optional.
- If `SMTP_USERNAME` or `SMTP_PASSWORD` is missing, the email is silently skipped with a warning log — the flow continues without error.
- Used for: email verification, password reset, application acceptance notifications.

**File uploads:**
- Resume uploads saved to `uploads/resumes/` (relative to backend working directory).
- Directory is created at runtime if missing.
- Max upload size: 50 MB (enforced by Nginx `client_max_body_size`).

**Custom exception classes** (`PythonProject/utils/exceptions.py`):

| Exception | HTTP Status | Purpose |
| --- | --- | --- |
| `CredentialsException` | 401 | Authentication failures |
| `NotFoundException` | 404 | Resource not found |
| `ForbiddenException` | 403 | Access denied |
| `BadRequestException` | 400 | Invalid input |
| `ConflictException` | 409 | Duplicate entries |
| `ValidationException` | 422 | Validation errors |

### 4.3 AI Matching Service (FastAPI + ML)

**Entry point:** `ai_matching/app/main.py`  
**App title:** "AI Matching Module (Phase-1)"

**Runtime process:**
- **Systemd service:** `praktiki-ai-matching`
- **Command:** `gunicorn app.main:app --workers 2 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8001 --timeout 120`
- **Memory limits (systemd):** `MemoryMax=3G`, `MemoryHigh=2G`
- **Swap:** 4 GB swap file created by setup script for ML model loading

**Python dependencies** (`ai_matching/requirements.txt`):

| Package | Purpose |
| --- | --- |
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `numpy` | Numerical operations |
| `pydantic` | Data validation |
| `sentence-transformers` | Text embedding model |
| `scikit-learn` | ML utilities |
| `torch` | PyTorch runtime |

**ML model and pipeline:**
- Sentence Transformers model: `all-MiniLM-L6-v2` (pre-downloaded during deployment)
- `HybridMatcher` — combines rule-based scoring + sentence embedding similarity
- `ReRanker` — cross-encoder reranking of top 10 candidates
- `FeedbackEngine` — computes feedback boost from user interaction signals

**Matching flow:**
```
Input (student profile + available internships)
  → Hybrid matching (rule-based + embedding similarity + feedback boost)
    → Cross-encoder reranking (top 10 candidates)
      → Final ranked recommendations
```

**Endpoints:**

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | Health check |
| `GET` | `/recommend` | Basic recommendations (deprecated) |
| `GET` | `/recommend/hybrid` | Hybrid matching with reranking |
| `POST` | `/match` | Direct matching |
| `POST` | `/recommend` | Recommendations with body params |
| `POST` | `/feedback` | Record user feedback |

**Data sources and state:**
- Loads data from static JSON files at startup:
  - `ai_matching/app/data/students.json`
  - `ai_matching/app/data/internships.json`
- Feedback store is **in-memory only** (`app/feedback/feedback_store.py`) — lost on restart.
- In-memory metrics counters (`app/analytics/metrics.py`) — not persisted.
- Match decisions logged to `ai_matching/logs/match_decisions.jsonl`.

### 4.4 Backend AI Integration

The backend includes an AI service adapter at `PythonProject/services/ai_service.py`:

| Behavior | Details |
| --- | --- |
| Primary path | Imports `ai_matching/` as a Python library directly |
| Fallback path | Basic skill-based matching if AI imports fail |
| Caching | In-memory recommendation cache with 24-hour TTL |
| Failure mode | Graceful degradation — returns basic matches instead of errors |

---

## 5. Deployment Specification

### 5.1 Infrastructure Baseline

| Instance | AWS Type | OS | Purpose |
| --- | --- | --- | --- |
| Frontend | t2.micro | Ubuntu 22.04 LTS | Nginx + static assets |
| Backend | t2.micro or t2.small | Ubuntu 22.04 LTS | FastAPI + PostgreSQL client |
| AI Matching | t2.medium or larger (4 GB+ RAM) | Ubuntu 22.04 LTS | FastAPI + ML models |

**Current production IPs** (from `deploy/deploy_all.sh`):
- Backend: `44.205.136.199`
- AI Matching: `52.205.225.84`
- Frontend: `44.197.97.159`
- SSH key: `prakritii.pem`

### 5.2 System Packages Installed by Scripts

| Package | Installed On |
| --- | --- |
| Python 3, pip, venv, build-essential | Backend, AI Matching |
| libpq-dev | Backend (PostgreSQL client library) |
| Node.js 20 LTS | Frontend |
| Nginx | All instances |
| Supervisor | Backend, AI Matching |
| curl, git, htop, unzip | All instances |

### 5.3 Automated Deployment (Recommended)

**Master script:** `deploy/deploy_all.sh`

**Deployment sequence:**
1. Validates SSH key file exists and host IPs are configured.
2. Uploads `PythonProject/`, `ai_matching/`, and `frontend/` to `/home/ubuntu/` via SCP/rsync.
3. Auto-generates `frontend/.env` with backend and AI matching URLs.
4. Executes `setup_backend.sh` on the backend instance via SSH.
5. Executes `setup_ai_matching.sh` on the AI instance via SSH.
6. Executes `setup_frontend.sh` on the frontend instance via SSH.
7. Runs health checks for all three services.

**Usage:**
```bash
# From local machine (Git Bash or WSL on Windows)
cd deploy/
chmod +x deploy_all.sh
./deploy_all.sh
```

### 5.4 Manual Deployment (Per Instance)

Manual steps documented in `deploy/README.md`:
1. SCP or rsync the service folder to `/home/ubuntu/` on the target instance.
2. Create or update the `.env` file with production values.
3. Run the appropriate `setup_*.sh` script on the instance.
4. Verify the service is running via health check.

### 5.5 Post-Deployment Configuration

1. Update each service `.env` with production values (see [Section 6](#6-configuration-and-environment-variables)).
2. Restart backend: `sudo systemctl restart praktiki-backend`
3. Restart AI matching: `sudo systemctl restart praktiki-ai-matching`
4. Rebuild frontend after `.env` changes: `cd /home/ubuntu/frontend && npm run build && sudo systemctl restart nginx`

### 5.6 SSL/TLS

Let's Encrypt via Certbot is the recommended approach:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Certbot auto-renews via systemd timer. Verify with:
```bash
sudo certbot renew --dry-run
```

### 5.7 Rollback Procedure

There is no automated rollback mechanism. Manual rollback steps:

1. **Identify the issue:** Check logs (see [Section 10](#10-operational-runbook)).
2. **Re-upload previous code version:**
   ```bash
   # From local machine, checkout previous commit
   git checkout <previous-commit-sha>
   # Re-run deployment
   ./deploy/deploy_all.sh
   ```
3. **Database rollback** (if migrations were applied):
   ```bash
   cd /home/ubuntu/PythonProject
   source venv/bin/activate
   alembic downgrade -1
   ```
4. **Restart services:**
   ```bash
   sudo systemctl restart praktiki-backend
   sudo systemctl restart praktiki-ai-matching
   sudo systemctl restart nginx
   ```

---

## 6. Configuration and Environment Variables

### 6.1 Backend

**Primary references:**
- Code: `PythonProject/utils/settings.py`
- Template: `deploy/env_templates/backend.env.template`

**Required variables:**

| Variable | Type | Description |
| --- | --- | --- |
| `DATABASE_URL` | string | SQLAlchemy connection string (e.g., `postgresql://user:pass@host:5432/praktiki`) |
| `JWT_SECRET` | string | Secret key for JWT signing — **must be cryptographically random** |

**Optional variables (used by code):**

| Variable | Type | Default | Description |
| --- | --- | --- | --- |
| `APP_ENV` | string | `"development"` | Application environment identifier |
| `JWT_ALGO` | string | `"HS256"` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | int | `1440` (24 hours) | JWT token lifetime |
| `SMTP_SERVER` | string | `"smtp.gmail.com"` | SMTP host for email sending |
| `SMTP_PORT` | int | `587` | SMTP port |
| `SMTP_USERNAME` | string | `None` | SMTP auth username — if missing, email is silently skipped |
| `SMTP_PASSWORD` | string | `None` | SMTP auth password |
| `SENDER_EMAIL` | string | `"noreply@praktiki.com"` | From address for outbound emails |
| `REDIS_URL` | string | `None` | Redis connection (reserved for future use) |
| `AWS_S3_BUCKET` | string | `None` | S3 bucket name (reserved for future use) |
| `AWS_ACCESS_KEY_ID` | string | `None` | AWS credential (reserved for future use) |
| `AWS_SECRET_ACCESS_KEY` | string | `None` | AWS credential (reserved for future use) |

**Template-only variables** (in `backend.env.template` but not read by code):

| Variable | Notes |
| --- | --- |
| `DEBUG` | Not used — consider adding to `Settings` class |
| `ENVIRONMENT` | Overlaps with `APP_ENV` — alignment needed |
| `JWT_EXPIRATION_MINUTES` | Template name differs from code name (`ACCESS_TOKEN_EXPIRE_MINUTES`) |
| `CORS_ORIGINS` | Not used — CORS is hard-coded in `main.py` |

### 6.2 Frontend

**Primary references:**
- Code: `frontend/src/config/index.ts`
- Template: `deploy/env_templates/frontend.env.template`

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `VITE_API_URL` | Yes | `http://localhost:8000` | Backend API base URL — **baked into build output** |
| `VITE_APP_NAME` | No | `"Praktiki"` | Application display name |
| `VITE_APP_VERSION` | No | `"1.0.0"` | Application version string |

**Template-only variable:**

| Variable | Notes |
| --- | --- |
| `VITE_AI_MATCHING_URL` | In template but **never referenced** in frontend code |

> **Important:** All `VITE_*` variables are embedded at build time. Changing them requires rebuilding the frontend (`npm run build`) and restarting Nginx.

### 6.3 AI Matching

**Primary references:**
- Template: `deploy/env_templates/ai_matching.env.template`
- Setup script: `deploy/setup_ai_matching.sh`

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `BACKEND_API_URL` | Yes | — | Backend URL (defined but not actively used in current code paths) |
| `API_PORT` | No | `8001` | Service listen port |
| `MODEL_CACHE_DIR` | No | `/home/ubuntu/ai_matching/model_cache` | Directory for cached ML models |
| `TRANSFORMER_MODEL` | No | `all-MiniLM-L6-v2` | Sentence transformer model name |
| `WORKERS` | No | `2` | Gunicorn worker count |
| `MAX_RERANK_CANDIDATES` | No | `10` | Max candidates for cross-encoder reranking |
| `MATCH_THRESHOLD` | No | `0.5` | Minimum match score threshold |

### 6.4 Configuration Precedence

| Service | Loading Method | Reload Behavior |
| --- | --- | --- |
| Backend | Systemd `EnvironmentFile` + `pydantic-settings` | Requires service restart |
| AI Matching | Systemd `EnvironmentFile` + `pydantic-settings` | Requires service restart |
| Frontend | Vite `import.meta.env` | Requires `npm run build` + Nginx restart |

### 6.5 Environment Variable Matrix

| Variable | Component | Required | Used by Code | Notes |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Backend | Yes | Yes | SQLAlchemy connection string |
| `JWT_SECRET` | Backend | Yes | Yes | Must be strong, random |
| `APP_ENV` | Backend | No | Yes | Default `"development"` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Backend | No | Yes | Default 1440 (24h) |
| `JWT_ALGO` | Backend | No | Yes | Default HS256 |
| `SMTP_*` (5 vars) | Backend | No | Yes | Enables email — graceful skip if missing |
| `REDIS_URL` | Backend | No | Declared | Not yet implemented |
| `AWS_*` (3 vars) | Backend | No | Declared | Not yet implemented |
| `VITE_API_URL` | Frontend | Yes | Yes | Baked at build time |
| `VITE_APP_NAME` | Frontend | No | Yes | UI display |
| `VITE_APP_VERSION` | Frontend | No | Yes | UI display |
| `VITE_AI_MATCHING_URL` | Frontend | No | **No** | Template only — unused |
| `BACKEND_API_URL` | AI Matching | Yes | Declared | Not actively used |
| `MODEL_CACHE_DIR` | AI Matching | No | Yes | Model storage path |
| `TRANSFORMER_MODEL` | AI Matching | No | Yes | Default `all-MiniLM-L6-v2` |
| `MAX_RERANK_CANDIDATES` | AI Matching | No | Yes | Default 10 |
| `MATCH_THRESHOLD` | AI Matching | No | Yes | Default 0.5 |

---

## 7. Data Storage and Persistence

### 7.1 PostgreSQL (Primary Data Store)

**Connection:** Configured via `DATABASE_URL` in backend `.env`.

**Core tables:**

| Table | Model File | Description |
| --- | --- | --- |
| `users` | `models/user.py` | All user accounts (student, employer, institute, admin) |
| `student_profiles` | `models/student_profile.py` | Extended student information |
| `student_resumes` | `models/student_profile.py` | Resume data (JSON text fields + file path) |
| `employer_profiles` | `models/employer_profile.py` | Company information |
| `institute_profiles` | `models/institute_profile.py` | Educational institution info (AISHE code) |
| `internships` | `models/internship.py` | Internship listings |
| `applications` | `models/application.py` | Student applications to internships |
| `skills` | `models/skill.py` | Skill dictionary |
| `student_skills` | `models/student_skills.py` | Many-to-many: students ↔ skills |
| `internship_skills` | `models/internship_skills.py` | Many-to-many: internships ↔ skills |
| `notifications` | `models/notification.py` | Student notifications |

### 7.2 Data Model Details

**User** (`users`):

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | Integer | PK, auto-increment | |
| `email` | String | Unique, indexed | |
| `hashed_password` | String | Not null | |
| `full_name` | String | Not null | |
| `role` | String | Default `"student"` | `student`, `employer`, `institute`, `admin` |
| `is_email_verified` | Boolean | Default `False` | |
| `is_phone_verified` | Boolean | Default `False` | |
| `phone_number` | String | Nullable | |
| `apaar_id` | String(12) | Unique, indexed, nullable | Government student ID |
| `is_apaar_verified` | Boolean | Default `False` | |
| `email_otp_code` | String | Nullable | Temporary OTP |
| `email_otp_expires` | DateTime(tz) | Nullable | OTP expiry |
| `phone_otp_code` | String | Nullable | Temporary OTP |
| `phone_otp_expires` | DateTime(tz) | Nullable | OTP expiry |
| `verification_token` | String | Nullable | Email verification token |
| `verification_token_expires` | DateTime(tz) | Nullable | |
| `created_at` | DateTime(tz) | Server default `now()` | |

**StudentProfile** (`student_profiles`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer | PK |
| `user_id` | Integer | FK → `users.id`, unique |
| `institute_id` | Integer | FK → `institute_profiles.id`, nullable |
| `first_name`, `last_name`, `full_name` | String | Nullable |
| `phone_number`, `current_city`, `gender` | String | Nullable |
| `languages` | String | Comma-separated |
| `profile_type` | String | College student, Fresher, etc. |
| `university_name`, `degree`, `department` | String | Academic info |
| `year`, `start_year`, `end_year` | Integer | Academic timeline |
| `cgpa` | String | Grade point average |
| `skills`, `interests`, `projects` | Text | Free-text fields |
| `looking_for` | String | Jobs, Internships |
| `work_mode` | String | In-office, WFH |
| `apaar_id` | String | Unique, nullable |
| `is_apaar_verified` | Boolean | |
| `preferred_location` | String | Nullable |

**StudentResume** (`student_resumes`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer | PK |
| `student_id` | Integer | FK → `student_profiles.id`, unique |
| `career_objective` | Text | |
| `work_experience` | Text | JSON string |
| `projects` | Text | JSON string |
| `certifications` | Text | JSON string |
| `extra_curricular` | Text | JSON string |
| `education_entries` | Text | JSON string |
| `skills_categorized` | Text | JSON string |
| `resume_file_path` | String | Path to uploaded file |
| `title` | String | Resume title |
| `linkedin` | String | LinkedIn URL |
| `profile_picture` | String | Profile picture URL |

**EmployerProfile** (`employer_profiles`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer | PK |
| `user_id` | Integer | FK → `users.id`, unique |
| `company_name` | String | Not null |
| `contact_number` | String | Not null |
| `designation` | String | Nullable |
| `organization_description` | Text | Nullable |
| `city`, `industry` | String | Nullable |
| `employee_count` | String | Nullable (e.g., "100-500") |
| `logo_url`, `website_url` | String | Nullable |
| `license_document_url` | String | Nullable |
| `social_media_link` | String | Nullable |
| `is_verified` | Boolean | Default `False` |

**InstituteProfile** (`institute_profiles`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer | PK |
| `user_id` | Integer | FK → `users.id`, unique |
| `institute_name` | String | Not null |
| `aishe_code` | String | Not null, unique constraint |
| `contact_number` | String | Not null |

**Internship** (`internships`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer | PK |
| `employer_id` | Integer | FK → `employer_profiles.id` |
| `title` | String | Not null |
| `description` | String | Nullable |
| `location` | String | Not null |
| `mode` | String | Not null (`remote`, `onsite`, `hybrid`) |
| `duration_weeks` | Integer | Not null |
| `status` | String | Default `"active"` |
| `stipend_amount` | Integer | Nullable |
| `deadline`, `start_date` | String | Nullable (stored as strings, not dates) |
| `skills` | String | Comma-separated |
| `openings` | Integer | Default 1 |
| `qualifications`, `benefits` | String | Nullable |
| `contact_name`, `contact_email`, `contact_phone` | String | Nullable |
| `application_link`, `application_email` | String | Nullable |

**Application** (`applications`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer | PK |
| `student_id` | Integer | FK → `student_profiles.id` |
| `internship_id` | Integer | FK → `internships.id` |
| `status` | String | Default `"pending"` (`pending`, `accepted`, `rejected`, `shortlisted`) |
| `applied_at` | DateTime(tz) | Server default `now()` |

**Notification** (`notifications`):

| Column | Type | Notes |
| --- | --- | --- |
| `id` | Integer | PK |
| `student_id` | Integer | FK → `student_profiles.id` |
| `message` | String | Not null |
| `created_at` | DateTime(tz) | Server default `now()` |

### 7.3 Migrations

- **Alembic** migrations in `PythonProject/migrations/`.
- 14 migration versions tracking schema evolution.
- Configuration in `PythonProject/alembic.ini` and `migrations/env.py`.
- **Runtime schema modification:** `main.py` also auto-creates tables and dynamically adds columns at startup, which can conflict with Alembic's state tracking.

### 7.4 File Storage

| What | Location | Persistence | Backup |
| --- | --- | --- | --- |
| Resume uploads | `uploads/resumes/` (relative to backend CWD) | Local disk | Not automated |
| AI model cache | `/home/ubuntu/ai_matching/model_cache/` | Local disk | Re-downloadable |

> **Risk:** Resume files on local EC2 disk are lost if the instance is terminated. Consider S3 migration (AWS variables are already declared in settings).

### 7.5 AI Matching Data

| Data | Location | Persistence |
| --- | --- | --- |
| Student/internship data | `ai_matching/app/data/*.json` | Static files (bundled with deployment) |
| Feedback signals | In-memory (`app/feedback/feedback_store.py`) | **Lost on restart** |
| Analytics metrics | In-memory (`app/analytics/metrics.py`) | **Lost on restart** |
| Match decision logs | `ai_matching/logs/match_decisions.jsonl` | Local disk |

### 7.6 Data Retention

> **Gap:** No retention or deletion policies are defined. Production should define and enforce retention for:
> - PostgreSQL records (user data, applications)
> - Uploaded resume files
> - AI matching logs and decision history
> - OTP codes and verification tokens (currently no cleanup job)

---

## 8. Security

### 8.1 Authentication

| Aspect | Implementation |
| --- | --- |
| Method | JWT Bearer tokens |
| Signing algorithm | HS256 (configurable via `JWT_ALGO`) |
| Token lifetime | 24 hours (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`) |
| Token storage | Client-side `localStorage` (`praktiki_token` key) |
| Token issuance | `PythonProject/utils/security.py` → `create_access_token()` |
| Token validation | `PythonProject/utils/dependencies.py` → `get_current_user()` |

### 8.2 Password Security

| Aspect | Implementation |
| --- | --- |
| Library | `passlib` with `CryptContext` |
| Supported schemes | `bcrypt`, `sha256_crypt` |
| **Default scheme** | **`sha256_crypt`** (not bcrypt) |
| Deprecated | `auto` — older hashes are auto-upgraded on verification |
| Bcrypt compatibility | Explicit fallback handler for bcrypt 5.0.0 edge cases |

> **Note:** The default hash scheme is `sha256_crypt`, which is weaker than bcrypt for password hashing. Consider switching the default to `bcrypt`.

### 8.3 Authorization

| Dependency | Enforces |
| --- | --- |
| `get_current_user` | Valid JWT with existing user |
| `get_current_student` | `role == "student"` |
| `get_current_employer` | `role == "employer"` |
| `get_current_admin` | `role == "admin"` |
| `require_role(roles)` | User role in allowed list |
| `require_verified_employer` | Profile completeness (5 required fields) |

### 8.4 Input Validation

| Layer | Mechanism |
| --- | --- |
| Request bodies | Pydantic schemas with type validation |
| Email fields | `EmailStr` validator |
| APAAR ID | Regex pattern `^\d{12}$` |
| SQL injection | SQLAlchemy parameterized queries |
| File uploads | Nginx `client_max_body_size 50M` |

### 8.5 Infrastructure Security

| Control | Status |
| --- | --- |
| TLS/HTTPS | Recommended (Certbot), not enforced by scripts |
| Firewall | UFW enabled on all instances |
| Security headers | Frontend Nginx: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection` |
| Secrets storage | `.env` files on servers — not committed to git |
| SSH access | Key-pair based (`.pem` file) |

### 8.6 Known Security Gaps

| Gap | Severity | Details |
| --- | --- | --- |
| CORS hard-coded to localhost | **High** | `main.py` lists only `localhost:5173/5174/5175/3000`. Production domains not included. Must be environment-driven. |
| No rate limiting | **High** | No protection against brute-force login, API abuse, or DDoS. `REDIS_URL` is declared but unused. |
| `sha256_crypt` as default hash | **Medium** | Weaker than bcrypt for password storage. Should switch default to `bcrypt`. |
| Email verification disabled | **Medium** | Login does not enforce email verification (check is commented out in `api/v1/auth.py`). |
| Employer verification disabled | **Medium** | Email/phone verification check in `require_verified_employer` is commented out. |
| No HTTPS enforcement | **Medium** | Scripts don't auto-configure Certbot. HTTP traffic is unencrypted. |
| JWT in localStorage | **Low** | Vulnerable to XSS attacks. Consider `httpOnly` cookies for token storage. |
| No input sanitization | **Low** | Relies on Pydantic + SQLAlchemy. No explicit XSS sanitization for user-generated text fields. |
| OTP codes not auto-expired | **Low** | Expiry fields exist but no background cleanup job removes stale OTPs. |

---

## 9. Observability and Monitoring

### 9.1 Logging

| Source | Location | Format |
| --- | --- | --- |
| Backend access logs | `/var/log/praktiki-backend/access.log` | Gunicorn access log format |
| Backend error logs | `/var/log/praktiki-backend/error.log` | Gunicorn error log format |
| Backend app logs | stdout (via systemd/journalctl) | Custom print statements (method, URL, status) |
| AI Matching access logs | `/var/log/praktiki-ai-matching/access.log` | Gunicorn access log format |
| AI Matching error logs | `/var/log/praktiki-ai-matching/error.log` | Gunicorn error log format |
| AI decision logs | `ai_matching/logs/match_decisions.jsonl` | JSON lines |
| Nginx access logs | `/var/log/nginx/access.log` | Nginx combined format |
| Nginx error logs | `/var/log/nginx/error.log` | Nginx error format |

### 9.2 Metrics

| Metric Source | Storage | Persistence |
| --- | --- | --- |
| AI service counters | In-memory (`app/analytics/metrics.py`) | Lost on restart |
| Request logs | Gunicorn log files | Persistent on disk |

> **Gap:** No external metrics backend (Prometheus, CloudWatch, Datadog) is configured. No dashboards or alerting.

### 9.3 Health Checks

| Service | Endpoint | Expected Response |
| --- | --- | --- |
| Backend | `GET /` | 200 OK |
| Backend | `GET /docs` | Swagger UI HTML |
| AI Matching | `GET /` | 200 OK |
| AI Matching | `GET /docs` | Swagger UI HTML |
| Frontend | `GET /` | SPA HTML |
| Frontend | `GET /health` | 200 OK (Nginx location) |

### 9.4 What Is Not Monitored

- Database connection pool health
- Disk space usage
- Memory usage trends
- Request latency (p50, p95, p99)
- Error rates and 5xx trends
- AI model inference latency
- SSL certificate expiry

---

## 10. Operational Runbook

### 10.1 Service Management

**Check service status:**
```bash
sudo systemctl status praktiki-backend
sudo systemctl status praktiki-ai-matching
sudo systemctl status nginx
```

**Restart services:**
```bash
sudo systemctl restart praktiki-backend
sudo systemctl restart praktiki-ai-matching
sudo systemctl restart nginx
```

**Stop services:**
```bash
sudo systemctl stop praktiki-backend
sudo systemctl stop praktiki-ai-matching
```

**Enable services on boot:**
```bash
sudo systemctl enable praktiki-backend
sudo systemctl enable praktiki-ai-matching
sudo systemctl enable nginx
```

### 10.2 Log Access

**Stream live logs:**
```bash
# Backend application logs
sudo journalctl -u praktiki-backend -f

# AI Matching application logs
sudo journalctl -u praktiki-ai-matching -f

# Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Backend access logs
sudo tail -f /var/log/praktiki-backend/access.log
```

**Search logs:**
```bash
# Find errors in backend logs from the last hour
sudo journalctl -u praktiki-backend --since "1 hour ago" | grep -i error

# Find 5xx responses in Nginx
sudo grep " 5[0-9][0-9] " /var/log/nginx/access.log | tail -20
```

### 10.3 Health Checks

```bash
# Backend
curl -s -o /dev/null -w "%{http_code}" http://<BACKEND_IP>:8000/

# AI Matching
curl -s -o /dev/null -w "%{http_code}" http://<AI_MATCHING_IP>:8001/

# Frontend
curl -s -o /dev/null -w "%{http_code}" http://<FRONTEND_IP>/health
```

### 10.4 Common Troubleshooting

**Service won't start:**
```bash
# Check full error output
sudo journalctl -u praktiki-backend -n 50 --no-pager

# Check if port is already in use
sudo ss -tlnp | grep 8000

# Verify .env file exists and is readable
ls -la /home/ubuntu/PythonProject/.env

# Test the app manually
cd /home/ubuntu/PythonProject
source venv/bin/activate
python -c "from main import app; print('OK')"
```

**Database connection failures:**
```bash
# Test PostgreSQL connectivity
psql "$DATABASE_URL" -c "SELECT 1;"

# Check if PostgreSQL is running
sudo systemctl status postgresql

# Check connection pool (from backend instance)
curl http://localhost:8000/docs  # If Swagger loads, DB is connected
```

**AI Matching out of memory:**
```bash
# Check memory usage
free -h

# Check if swap is active
swapon --show

# Check service memory limits
systemctl show praktiki-ai-matching | grep Memory

# Restart with fresh memory
sudo systemctl restart praktiki-ai-matching
```

**Frontend shows stale content:**
```bash
# Verify the build output
ls -la /home/ubuntu/frontend/dist/

# Rebuild
cd /home/ubuntu/frontend
npm run build

# Clear Nginx cache and restart
sudo systemctl restart nginx
```

**502 Bad Gateway:**
```bash
# Backend not running or not listening
sudo systemctl status praktiki-backend
sudo ss -tlnp | grep 8000

# Nginx config error
sudo nginx -t
sudo systemctl restart nginx
```

### 10.5 Database Operations

**Run migrations:**
```bash
cd /home/ubuntu/PythonProject
source venv/bin/activate
alembic upgrade head
```

**Rollback last migration:**
```bash
alembic downgrade -1
```

**Check current migration version:**
```bash
alembic current
```

**Manual database backup:**
```bash
pg_dump -h <DB_HOST> -U <DB_USER> -d praktiki > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 10.6 SSL Certificate Renewal

```bash
# Check certificate expiry
sudo certbot certificates

# Manual renewal
sudo certbot renew

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 11. Capacity, Scaling, and Performance

### 11.1 Current Resource Allocation

| Service | Instance | Workers | Timeout | Memory Limit |
| --- | --- | --- | --- | --- |
| Backend | t2.micro/small | 4 Gunicorn | Default | None (instance limit) |
| AI Matching | t2.medium+ | 2 Gunicorn | 120s | `MemoryMax=3G`, `MemoryHigh=2G` |
| Frontend | t2.micro | N/A (static) | N/A | N/A |

### 11.2 Known Bottlenecks

| Bottleneck | Details | Mitigation |
| --- | --- | --- |
| AI model loading | Sentence Transformer loads ~400 MB into memory per worker | 4 GB swap + 2-worker limit |
| Resume uploads | Stored on local disk; single point of failure | Migrate to S3 |
| AI feedback store | In-memory; lost on restart | Persist to PostgreSQL or Redis |
| Database connections | No connection pooling configured beyond SQLAlchemy defaults | Configure pool size and overflow |

### 11.3 Scaling Strategies

| Component | Horizontal | Vertical |
| --- | --- | --- |
| Frontend | Add instances behind ALB; use CDN (CloudFront) | Minimal benefit |
| Backend | Increase worker count; add instances behind ALB | Upgrade instance type |
| AI Matching | Increase worker count (watch memory) | Upgrade to GPU instance for inference |
| Database | Read replicas (RDS) | Upgrade instance class |

### 11.4 Performance Considerations

- **Frontend:** Static assets cached for 1 year (`immutable`). Gzip enabled. Consider adding Brotli compression and CDN.
- **Backend:** API timeout via Nginx is 300s for read, 75s for connect. Consider reducing for most endpoints.
- **AI Matching:** ML inference timeout is 120s. Cross-encoder reranking is the most expensive operation (limited to top 10 candidates).
- **Database:** No query optimization or indexing strategy documented beyond default model indexes.

---

## 12. Backup, Recovery, and Disaster Recovery

### 12.1 What Needs Backup

| Data | Location | Criticality | Current Backup |
| --- | --- | --- | --- |
| PostgreSQL database | DB host | **Critical** | None automated |
| Resume files | `uploads/resumes/` on backend EC2 | **High** | None |
| AI match logs | `ai_matching/logs/` on AI EC2 | Medium | None |
| `.env` files | Each EC2 instance | **High** | None (not in git) |
| SSL certificates | `/etc/letsencrypt/` | Medium | Certbot auto-renewal |

### 12.2 Recommended Backup Procedures

**PostgreSQL:**
```bash
# Daily automated backup (add to crontab)
0 2 * * * pg_dump -h <DB_HOST> -U <DB_USER> -d praktiki | gzip > /backups/praktiki_$(date +\%Y\%m\%d).sql.gz

# Or use AWS RDS automated snapshots (if using RDS)
```

**Resume files:**
```bash
# Sync to S3 (recommended)
aws s3 sync /home/ubuntu/PythonProject/uploads/resumes/ s3://praktiki-backups/resumes/

# Or rsync to backup server
rsync -avz /home/ubuntu/PythonProject/uploads/ backup-server:/backups/praktiki/uploads/
```

**Environment files:**
```bash
# Copy .env files to secure backup (encrypted)
tar czf - /home/ubuntu/*/.env | gpg --encrypt -r ops@praktiki.com > env_backup.tar.gz.gpg
```

### 12.3 Recovery Procedures

**Full database restore:**
```bash
# From SQL dump
gunzip -c backup_20260209.sql.gz | psql -h <DB_HOST> -U <DB_USER> -d praktiki

# From RDS snapshot (AWS console or CLI)
aws rds restore-db-instance-from-db-snapshot --db-instance-identifier praktiki-restored --db-snapshot-identifier <snapshot-id>
```

**Service recovery from scratch:**
1. Launch new EC2 instance with Ubuntu 22.04.
2. Upload code and `.env` from backup.
3. Run the appropriate `setup_*.sh` script.
4. Restore database from backup.
5. Verify via health checks.

### 12.4 Recovery Time Objectives

> **Gap:** No RTO/RPO targets are defined. Recommended starting points:
>
> | Metric | Target | Notes |
> | --- | --- | --- |
> | RTO (Recovery Time Objective) | < 2 hours | Time to restore full service |
> | RPO (Recovery Point Objective) | < 24 hours | Maximum acceptable data loss |

---

## 13. Incident Response

### 13.1 Severity Classification

| Level | Criteria | Examples |
| --- | --- | --- |
| **P1 — Critical** | Complete service outage or data loss | Database down, all API calls failing, data breach |
| **P2 — High** | Major feature broken, significant user impact | Login broken, applications not submitting, AI service down |
| **P3 — Medium** | Minor feature broken, workaround available | Email notifications failing, map not loading |
| **P4 — Low** | Cosmetic or minor issue | UI alignment bug, slow response on edge case |

### 13.2 Response Checklist

1. **Detect:** Identify the issue via health checks, logs, or user reports.
2. **Triage:** Classify severity using the table above.
3. **Communicate:** Notify the team (Slack, email, etc.).
4. **Investigate:** Use the troubleshooting procedures in [Section 10.4](#104-common-troubleshooting).
5. **Mitigate:** Apply a fix or workaround.
   - Restart the affected service.
   - Roll back the last deployment if the issue was introduced by a code change.
   - Failover to a backup instance if available.
6. **Resolve:** Deploy a permanent fix.
7. **Post-mortem:** Document root cause, timeline, impact, and preventive actions.

### 13.3 Emergency Contacts

> **Action needed:** Populate with actual team contacts.
>
> | Role | Name | Contact |
> | --- | --- | --- |
> | On-call engineer | TBD | TBD |
> | Technical lead | TBD | TBD |
> | Database admin | TBD | TBD |

---

## 14. Testing and Verification

### 14.1 Smoke Tests (Post-Deployment)

| Service | Test | Expected |
| --- | --- | --- |
| Backend | `curl http://<IP>:8000/` | 200 OK |
| Backend | `curl http://<IP>:8000/docs` | Swagger UI HTML |
| AI Matching | `curl http://<IP>:8001/` | 200 OK |
| AI Matching | `curl http://<IP>:8001/docs` | Swagger UI HTML |
| Frontend | `curl http://<IP>/` | SPA HTML |
| Frontend | `curl http://<IP>/health` | 200 OK |

### 14.2 Functional Verification

```bash
# 1. Test user registration
curl -X POST http://<BACKEND_IP>:8000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "full_name": "Test User", "password": "TestPass123", "role": "student"}'

# 2. Test login
curl -X POST http://<BACKEND_IP>:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "TestPass123"}'

# 3. Test authenticated endpoint (use token from step 2)
curl http://<BACKEND_IP>:8000/auth/me \
  -H "Authorization: Bearer <token>"

# 4. Test AI Matching health
curl http://<AI_MATCHING_IP>:8001/

# 5. Test AI recommendations
curl "http://<AI_MATCHING_IP>:8001/recommend?student_id=1"
```

### 14.3 Build Verification

| Service | Command | Success Criteria |
| --- | --- | --- |
| Frontend | `npm run build` | `dist/` directory created without errors |
| Backend | `pip install -r requirements.txt` | All packages installed |
| AI Matching | `pip install -r requirements.txt` | All packages installed (may take ~10 min for PyTorch) |

### 14.4 Testing Gaps

- No automated test suite in CI/CD.
- No integration tests for cross-service flows.
- No load testing or performance benchmarks.
- No security scanning (SAST/DAST).

---

## 15. Production Readiness Assessment

### 15.1 Readiness Matrix

| Category | Status | Details |
| --- | --- | --- |
| **Deployment** | Partial | Script-based deployment works; no CI/CD, no Docker, no rollback automation |
| **Configuration** | Partial | Templates exist but variable names mismatch between code and templates |
| **Security** | Needs Work | CORS hard-coded, no rate limiting, verification gates disabled, weak default hash |
| **Monitoring** | Needs Work | Log files only; no metrics, dashboards, or alerting |
| **Data Persistence** | Needs Work | AI state is in-memory; resumes on local disk; no automated backups |
| **Scalability** | Partial | Worker counts configured; no load balancer, no horizontal scaling |
| **Documentation** | Good | This spec, API docs, and deployment README exist |
| **Testing** | Needs Work | No automated tests in CI/CD |

### 15.2 Detailed Gap List

| # | Gap | Severity | Category |
| --- | --- | --- | --- |
| 1 | CORS origins hard-coded to localhost | **Critical** | Security |
| 2 | No rate limiting | **Critical** | Security |
| 3 | No CI/CD pipeline | **High** | Deployment |
| 4 | No Docker containerization | **High** | Deployment |
| 5 | Backend dependencies unpinned (no version specifiers in `requirements.txt`) | **High** | Deployment |
| 6 | AI matching uses static JSON data instead of live database | **High** | Data |
| 7 | AI feedback store is in-memory only | **High** | Data |
| 8 | No automated database backups | **High** | Data |
| 9 | Resume files on local disk (single point of failure) | **High** | Data |
| 10 | Email verification disabled at login | **Medium** | Security |
| 11 | Employer email/phone verification check commented out | **Medium** | Security |
| 12 | `sha256_crypt` as default password hash | **Medium** | Security |
| 13 | Env template variable names don't match code variable names | **Medium** | Configuration |
| 14 | `VITE_AI_MATCHING_URL` in template but unused in code | **Low** | Configuration |
| 15 | Runtime schema modification in `main.py` conflicts with Alembic | **Medium** | Data |
| 16 | No monitoring, metrics, or alerting | **High** | Observability |
| 17 | No load testing or performance benchmarks | **Medium** | Testing |
| 18 | No automated test suite | **Medium** | Testing |
| 19 | Internship `deadline` and `start_date` stored as strings, not date types | **Low** | Data |
| 20 | OTP codes have no background cleanup job | **Low** | Security |
| 21 | Frontend `VITE_API_URL` has localhost fallback in production config | **Medium** | Configuration |
| 22 | No HTTPS enforcement in deployment scripts | **Medium** | Security |

---

## 16. Remediation Roadmap

### Phase 1 — Critical Fixes (Week 1-2)

| Task | Gap # | Effort |
| --- | --- | --- |
| Make CORS origins configurable via `CORS_ORIGINS` env var | 1 | Low |
| Add rate limiting with `slowapi` or `fastapi-limiter` | 2 | Medium |
| Pin all dependency versions in `requirements.txt` | 5 | Low |
| Align env template variable names with code | 13 | Low |
| Add HTTPS enforcement to deploy scripts | 22 | Low |

### Phase 2 — High Priority (Week 3-4)

| Task | Gap # | Effort |
| --- | --- | --- |
| Set up CI/CD pipeline (GitHub Actions) | 3 | Medium |
| Dockerize all three services | 4 | Medium |
| Connect AI matching to live PostgreSQL data | 6 | High |
| Persist AI feedback to database | 7 | Medium |
| Set up automated PostgreSQL backups | 8 | Low |
| Migrate resume storage to S3 | 9 | Medium |
| Add monitoring and alerting (CloudWatch or Prometheus) | 16 | Medium |

### Phase 3 — Hardening (Week 5-6)

| Task | Gap # | Effort |
| --- | --- | --- |
| Re-enable email verification | 10 | Low |
| Re-enable employer verification | 11 | Low |
| Switch default password hash to bcrypt | 12 | Low |
| Remove runtime schema modification from `main.py` | 15 | Medium |
| Add automated integration tests | 18 | High |
| Add load testing | 17 | Medium |
| Change `deadline`/`start_date` to proper date columns | 19 | Medium |
| Add OTP cleanup background job | 20 | Low |

---

## 17. Appendix

### 17.1 Key Files and Paths

| Purpose | Path |
| --- | --- |
| Master deployment script | `deploy/deploy_all.sh` |
| Backend setup | `deploy/setup_backend.sh` |
| Frontend setup | `deploy/setup_frontend.sh` |
| AI Matching setup | `deploy/setup_ai_matching.sh` |
| Env templates | `deploy/env_templates/*.env.template` |
| Backend entry point | `PythonProject/main.py` |
| Backend settings | `PythonProject/utils/settings.py` |
| Backend security | `PythonProject/utils/security.py` |
| Backend dependencies | `PythonProject/utils/dependencies.py` |
| Backend exceptions | `PythonProject/utils/exceptions.py` |
| Backend email | `PythonProject/utils/email.py` |
| Database session | `PythonProject/db/session.py` |
| Alembic config | `PythonProject/alembic.ini` |
| Migrations | `PythonProject/migrations/` |
| AI entry point | `ai_matching/app/main.py` |
| AI hybrid matcher | `ai_matching/app/matching/hybrid_matcher.py` |
| AI reranker | `ai_matching/app/matching/reranker.py` |
| AI feedback store | `ai_matching/app/feedback/feedback_store.py` |
| AI metrics | `ai_matching/app/analytics/metrics.py` |
| Frontend entry point | `frontend/src/main.tsx` |
| Frontend config | `frontend/src/config/index.ts` |
| Frontend API client | `frontend/src/services/api.ts` |
| API documentation | `API_DOCUMENTATION.md` |
| Requirements analysis | `REQUIREMENTS_ANALYSIS.md` |

### 17.2 Systemd Service Names

| Service | Unit Name | Log Command |
| --- | --- | --- |
| Backend | `praktiki-backend` | `journalctl -u praktiki-backend -f` |
| AI Matching | `praktiki-ai-matching` | `journalctl -u praktiki-ai-matching -f` |
| Nginx | `nginx` | `journalctl -u nginx -f` |

### 17.3 Default Ports

| Port | Service | Protocol |
| --- | --- | --- |
| 22 | SSH | TCP |
| 80 | HTTP (Nginx) | TCP |
| 443 | HTTPS (Nginx + Certbot) | TCP |
| 5432 | PostgreSQL | TCP |
| 8000 | Backend API (Gunicorn) | TCP |
| 8001 | AI Matching API (Gunicorn) | TCP |

### 17.4 Revision History

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| 1.0 | 2026-02-08 | — | Initial production specification |
| 1.1 | 2026-02-08 | — | Added audience, user flows, and detailed component specs |
| 2.0 | 2026-02-09 | — | Major rewrite: added TOC, glossary, request lifecycle, full data model details, security gap analysis, operational runbook with troubleshooting, disaster recovery, incident response, remediation roadmap, revision history |
