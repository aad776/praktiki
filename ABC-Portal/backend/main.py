from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from backend.database import engine, Base
from backend.api import api_router
import time
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create Tables (Safe to run on every startup for SQLite, usage alembic for production)
Base.metadata.create_all(bind=engine)

# Metadata for API Docs
tags_metadata = [
    {"name": "Auth", "description": "Authentication operations (Login, Register, OTP)"},
    {"name": "Student", "description": "Student dashboard and application tracking"},
    {"name": "Company", "description": "Internship posting and applicant management"},
    {"name": "Institute", "description": "Credit verification and student oversight"},
    {"name": "Admin", "description": "System-wide analytics and management"},
]

app = FastAPI(
    title="ABC Credits Internship Portal",
    description="A comprehensive platform for managing internships and credit transfers between Companies, Students, and Institutes.",
    version="1.0.0",
    openapi_tags=tags_metadata
)

# CORS Configuration
origins = [
    "http://localhost",
    "http://localhost:5173", # Vite Frontend
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Middleware: Process Time Logging
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    logger.info(f"Path: {request.url.path} | Time: {process_time:.4f}s")
    return response

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global error occurred: {exc}")
    print(f"DEBUG: GLOBAL HANDLER CAUGHT: {exc}")
    import traceback
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"message": "Internal Server Error (Custom 2)", "detail": str(exc)},
    )

# Startup Event
@app.on_event("startup")
async def startup_event():
    logger.info("Application starting up...")
    logger.info("Database connection established.")

# Shutdown Event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Application shutting down...")

# Include Unified API Router
app.include_router(api_router)

@app.get("/", tags=["Health"])
def root():
    return {
        "message": "Welcome to ABC Credits Portal API",
        "status": "active",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="127.0.0.1", port=8002, reload=True)
