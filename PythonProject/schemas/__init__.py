# Pydantic schemas package
from .students import (
    UserCreate,
    UserOut,
    LoginRequest,
    StudentProfileUpdate,
    StudentProfileOut,
    SkillCreate,
    SkillOut,
    ApplicationCreate,
    ApplicationOut,
    RecommendedInternship,
    FeedbackAction,
    StudentResumeCreate,
    StudentResumeUpdate,
    StudentResumeOut
)
from .employer import (
    EmployerCreate,
    InternshipCreate,
    InternshipOut,
    ApplicationStatusUpdate
)
from .institute import InstituteCreate

__all__ = [
    # Student schemas
    "UserCreate",
    "UserOut",
    "LoginRequest",
    "StudentProfileUpdate",
    "StudentProfileOut",
    "SkillCreate",
    "SkillOut",
    "ApplicationCreate",
    "ApplicationOut",
    "RecommendedInternship",
    "FeedbackAction",
    "StudentResumeCreate",
    "StudentResumeUpdate",
    "StudentResumeOut",
    # Employer schemas
    "EmployerCreate",
    "InternshipCreate",
    "InternshipOut",
    "ApplicationStatusUpdate",
    # Institute schemas
    "InstituteCreate"
]
