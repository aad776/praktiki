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

# Create FastAPI app
app = FastAPI(
    title="Praktiki API",
    description="Campus-to-Career Placement and Internship Ecosystem",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Temporarily allow all for debugging
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

@app.on_event("startup")
def ensure_optional_columns():
    """Ensure newly added optional columns exist in SQLite without requiring Alembic migrations."""
    with engine.connect() as conn:
        def has_column(table: str, column: str) -> bool:
            result = conn.execute(text(f"PRAGMA table_info('{table}')"))
            cols = {row[1] for row in result.fetchall()}
            return column in cols

        def add_column(table: str, column_sql: str):
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column_sql}"))

        # employer_profiles
        employer_cols = [
            ("designation", "VARCHAR"),
            ("organization_description", "TEXT"),
            ("city", "VARCHAR"),
            ("industry", "VARCHAR"),
            ("employee_count", "VARCHAR"),
            ("logo_url", "VARCHAR"),
            ("website_url", "VARCHAR"),
            ("license_document_url", "VARCHAR"),
            ("social_media_link", "VARCHAR"),
            ("is_verified", "BOOLEAN DEFAULT 0"),
            ("is_phone_verified", "BOOLEAN DEFAULT 0"),
            ("phone_otp_code", "VARCHAR"),
            ("phone_otp_expires", "VARCHAR"),
            ("email_otp_code", "VARCHAR"),
            ("email_otp_expires", "VARCHAR")
        ]
        for name, sqltype in employer_cols:
            if not has_column("employer_profiles", name):
                add_column("employer_profiles", f"{name} {sqltype}")

        # student_resumes
        resume_cols = [
            ("education_entries", "TEXT"),
            ("skills_categorized", "TEXT"),
            ("title", "VARCHAR"),
            ("linkedin", "VARCHAR"),
            ("profile_picture", "VARCHAR"),
        ]
        for name, sqltype in resume_cols:
            if not has_column("student_resumes", name):
                add_column("student_resumes", f"{name} {sqltype}")
        # internship
        internship_cols = [
            ("stipend_amount", "INTEGER"),
            ("deadline", "VARCHAR"),
            ("start_date", "VARCHAR"),
            ("skills", "VARCHAR"),
            ("openings", "INTEGER DEFAULT 1"),
            ("qualifications", "VARCHAR"),
            ("benefits", "VARCHAR"),
            ("contact_name", "VARCHAR"),
            ("contact_email", "VARCHAR"),
            ("contact_phone", "VARCHAR"),
            ("application_link", "VARCHAR"),
            ("application_email", "VARCHAR")
        ]
        for name, sqltype in internship_cols:
            if not has_column("internships", name):
                add_column("internships", f"{name} {sqltype}")

        # users
        user_cols = [
            ("is_email_verified", "BOOLEAN DEFAULT 0"),
            ("is_phone_verified", "BOOLEAN DEFAULT 0"),
            ("phone_number", "VARCHAR"),
            ("email_otp_code", "VARCHAR"),
            ("email_otp_expires", "DATETIME"),
            ("phone_otp_code", "VARCHAR"),
            ("phone_otp_expires", "DATETIME")
        ]
        for name, sqltype in user_cols:
            if not has_column("users", name):
                add_column("users", f"{name} {sqltype}")

    Base.metadata.create_all(bind=engine)


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
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
