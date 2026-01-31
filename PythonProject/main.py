"""
Praktiki - Campus-to-Career Placement and Internship Ecosystem
Main FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(student_router, prefix="/students", tags=["Students"])
app.include_router(employer_router, prefix="/employers", tags=["Employers"])
app.include_router(institute_router, prefix="/institutes", tags=["Institutes"])


@app.get("/", tags=["Health"])
def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Welcome to Praktiki API",
        "version": "1.0.0"
    }








if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
