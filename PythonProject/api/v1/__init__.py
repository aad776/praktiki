# API v1 routes package
from .auth import router as auth_router
from .students import router as student_router
from .employers import router as employer_router
from .institutes import router as institute_router

__all__ = [
    "auth_router",
    "student_router", 
    "employer_router",
    "institute_router"
]
