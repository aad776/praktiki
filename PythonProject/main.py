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
        ("application_email", "VARCHAR(255)")
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
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
