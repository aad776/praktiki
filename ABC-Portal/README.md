# ABC Credits Internship Portal (FastAPI + React)

This is the **Full Stack** implementation using **FastAPI** (Backend) and **React** (Frontend), aligned with UGC/AICTE guidelines.

## 🏗️ Architecture

- **Frontend**: React (Vite + TailwindCSS)
- **Backend**: FastAPI (Python)
- **Database**: SQLite (via SQLAlchemy)
- **Auth**: JWT Token-based (Stateless)

## 🚀 Features

- **Role-Based Access Control**: Student, Company, Institute, Admin.
- **Credit Calculation**:
  - UGC Policy: 30 Hours = 1 Credit
  - AICTE Policy: 40 Hours = 1 Credit
- **Workflows**:
  - **Student**: Apply, View Credits, Dashboard.
  - **Company**: Post Internship, Mark Complete (Hours).
  - **Institute**: Approve/Reject Credits, Exports (CSV/PDF).
- **Analytics**:
  - CSV Registry
  - PDF Reports
  - Real-time Stats

## 📂 Project Structure

```
.
├── backend/            # FastAPI Backend
│   ├── main.py
│   ├── core/
│   ├── models/
│   ├── routers/
│   └── ...
├── frontend/           # React Frontend
│   ├── src/
│   │   ├── components/ # Dashboard Components
│   │   ├── context/    # Auth Context
│   │   ├── pages/      # Login & Main Dashboard
│   │   └── services/   # API Calls
│   └── ...
└── ...
```

## 🛠️ Setup & Run

### 1. Backend (FastAPI)

```bash
# Install dependencies
pip install -r requirements.txt

# Run Server
uvicorn backend.main:app --reload
```
Server runs at: `http://44.205.136.199:8000`

### 2. Frontend (React)

```bash
cd frontend

# Install dependencies
npm install

# Run Dev Server
npm run dev
```
Frontend runs at: `http://localhost:5173`

## ✅ Usage Guide

1. **Login** at `http://localhost:5173/login`.
2. **Roles & Credentials** (Created via `test_fastapi_flow.py`):
   - **Student**: `student_ash` / `password123`
   - **Company**: `google_inc` / `password123`
   - **Institute**: `iit_admin` / `password123`
