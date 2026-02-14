"""
Praktiki - Campus-to-Career Placement and Internship Ecosystem
Main FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from db.session import engine, Base
from models import *

# Import routers
from api.v1.auth import router as auth_router
from api.v1.students import router as student_router
from api.v1.employers import router as employer_router
from api.v1.institutes import router as institute_router
from api.v1.autocomplete import router as autocomplete_router
from api.v1.credits import router as credits_router
from api.v1.notifications import router as notifications_router

from fastapi.staticfiles import StaticFiles
import os

# Create FastAPI app
app = FastAPI(
    title="Praktiki API",
    description="Campus-to-Career Placement and Internship Ecosystem",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Ensure uploads directory exists
os.makedirs("uploads/profile_pictures", exist_ok=True)
os.makedirs("secure_uploads/resumes", exist_ok=True)
# Only mount public uploads (like profile pictures), NOT secure_uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"Incoming request: {request.method} {request.url}")
    response = await call_next(request)
    print(f"Response status: {response.status_code}")
    return response

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(student_router, prefix="/students", tags=["Students"])
app.include_router(employer_router, prefix="/employers", tags=["Employers"])
app.include_router(institute_router, prefix="/institutes", tags=["Institutes"])
app.include_router(autocomplete_router, prefix="/autocomplete", tags=["Autocomplete"])
app.include_router(credits_router, prefix="/credits", tags=["Credits"])
app.include_router(notifications_router, prefix="/notifications", tags=["Notifications"])

@app.on_event("startup")
def ensure_optional_columns():
    """Ensure newly added optional columns exist without requiring Alembic migrations.
    Works with both SQLite and PostgreSQL.
    """
    from sqlalchemy import inspect
    from sqlalchemy.exc import ProgrammingError, OperationalError
    
    # First, create all tables from models
    Base.metadata.create_all(bind=engine)
    
    # Use SQLAlchemy inspector to check columns (database-agnostic)
    inspector = inspect(engine)
    
    def has_column(table: str, column: str) -> bool:
        try:
            columns = inspector.get_columns(table)
            return any(c['name'] == column for c in columns)
        except Exception:
            return False
    
    def add_column_safely(table: str, column_name: str, column_type: str):
        """Try to add a column, ignoring if it already exists."""
        try:
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column_name} {column_type}"))
                conn.commit()
                print(f"Added column {column_name} to {table}")
        except (ProgrammingError, OperationalError) as e:
            # Column likely already exists
            pass
    
    # employer_profiles
    employer_cols = [
        ("designation", "VARCHAR(255)"),
        ("organization_description", "TEXT"),
        ("city", "VARCHAR(255)"),
        ("industry", "VARCHAR(255)"),
        ("employee_count", "VARCHAR(255)"),
        ("logo_url", "VARCHAR(500)"),
        ("website_url", "VARCHAR(500)"),
        ("license_document_url", "VARCHAR(500)"),
        ("social_media_link", "VARCHAR(500)"),
        ("is_verified", "BOOLEAN DEFAULT FALSE"),
    ]
    for name, sqltype in employer_cols:
        if not has_column("employer_profiles", name):
            add_column_safely("employer_profiles", name, sqltype)

    # internships
    internship_cols = [
        ("status", "VARCHAR(50) DEFAULT 'active'"),
        ("stipend_amount", "INTEGER"),
        ("deadline", "VARCHAR(255)"),
        ("start_date", "VARCHAR(255)"),
        ("skills", "VARCHAR(500)"),
        ("openings", "INTEGER DEFAULT 1"),
        ("qualifications", "TEXT"),
        ("benefits", "VARCHAR(500)"),
        ("contact_name", "VARCHAR(255)"),
        ("contact_email", "VARCHAR(255)"),
        ("contact_phone", "VARCHAR(255)"),
        ("application_link", "VARCHAR(500)"),
        ("application_email", "VARCHAR(255)"),
        ("policy", "VARCHAR(50)"),
        ("created_at", "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP")
    ]
    for name, sqltype in internship_cols:
        if not has_column("internships", name):
            add_column_safely("internships", name, sqltype)

    # users
    user_cols = [
        ("is_email_verified", "BOOLEAN DEFAULT FALSE"),
        ("is_phone_verified", "BOOLEAN DEFAULT FALSE"),
        ("phone_number", "VARCHAR(255)"),
        ("email_otp_code", "VARCHAR(255)"),
        ("email_otp_expires", "TIMESTAMP"),
        ("phone_otp_code", "VARCHAR(255)"),
        ("phone_otp_expires", "TIMESTAMP"),
        ("apaar_id", "VARCHAR(12)"),
        ("is_apaar_verified", "BOOLEAN DEFAULT FALSE")
    ]
    for name, sqltype in user_cols:
        if not has_column("users", name):
            add_column_safely("users", name, sqltype)
    
    # student_resumes
    resume_cols = [
        ("resume_file_path", "VARCHAR(500)"),
        ("resume_filename", "VARCHAR(255)"),
        ("resume_file_size", "INTEGER"),
        ("resume_uploaded_at", "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP")
    ]
    for name, sqltype in resume_cols:
        if not has_column("student_resumes", name):
            add_column_safely("student_resumes", name, sqltype)

    # notifications
    if not has_column("notifications", "is_read"):
        add_column_safely("notifications", "is_read", "BOOLEAN DEFAULT FALSE")

    # applications
    if not has_column("applications", "hours_worked"):
        add_column_safely("applications", "hours_worked", "INTEGER")
    if not has_column("applications", "policy_used"):
        add_column_safely("applications", "policy_used", "VARCHAR")
    if not has_column("applications", "credits_awarded"):
        add_column_safely("applications", "credits_awarded", "FLOAT")
    if not has_column("applications", "rejection_reason"):
        add_column_safely("applications", "rejection_reason", "VARCHAR")

    # credit_requests
    if not has_column("credit_requests", "remarks"):
        add_column_safely("credit_requests", "remarks", "VARCHAR")
    if not has_column("credit_requests", "created_at"):
        add_column_safely("credit_requests", "created_at", "TIMESTAMP")

    # audit_logs table should be created by Base.metadata.create_all(bind=engine)
    # but let's check if it exists or needs columns
    if not has_column("audit_logs", "details"):
        add_column_safely("audit_logs", "details", "VARCHAR")

    print("Database schema check complete.")


@app.get("/", tags=["Health"])
def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Welcome to Praktiki API",
        "version": "1.0.0"
    }








if __name__ == "__main__":
    # Create all database tables
    from db.session import engine, Base
    from models import *  # Import all models to ensure they're registered
    Base.metadata.create_all(bind=engine)
    
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
