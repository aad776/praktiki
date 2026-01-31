from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# 1. Signup ke waqt (Wahi purana logic)
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "student"


# 2. Signup/Login Output
class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str

    class Config:
        from_attributes = True


# 3. NAYA: Login ke waqt APAAR ID maangne ke liye
class LoginRequest(BaseModel):
    email: str
    password: str
    apaar_id: Optional[str] = Field(None, pattern=r"^\d{12}$", description="12 digit APAAR ID")



class StudentProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    current_city: Optional[str] = None
    gender: Optional[str] = None
    languages: Optional[str] = None
    
    profile_type: Optional[str] = None
    university_name: Optional[str] = None
    degree: Optional[str] = None  # e.g. B.Tech
    department: Optional[str] = None  # e.g. CSE
    year: Optional[int] = None # Keeping for backward compat, but start/end prefered
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    
    cgpa: Optional[str] = None

    # Career Interests
    preferred_location: Optional[str] = None
    interests: Optional[str] = None  # e.g. Web Dev, AI
    skills: Optional[str] = None  # Comma separated skills
    projects: Optional[str] = None
    
    looking_for: Optional[str] = None
    work_mode: Optional[str] = None


# 5. Profile Output (Details dikhane ke liye)
class StudentProfileOut(BaseModel):
    id: int
    user_id: int
    apaar_id: Optional[str]
    is_apaar_verified: bool
    
    first_name: Optional[str]
    last_name: Optional[str]
    full_name: Optional[str]
    
    university_name: Optional[str]
    degree: Optional[str]
    department: Optional[str]
    year: Optional[int]
    start_year: Optional[int]
    end_year: Optional[int]
    profile_type: Optional[str]
    
    cgpa: Optional[str]
    skills: Optional[str]
    interests: Optional[str]
    projects: Optional[str]
    phone_number: Optional[str]
    current_city: Optional[str]
    gender: Optional[str]
    languages: Optional[str]
    
    looking_for: Optional[str]
    work_mode: Optional[str]
    
    # We might want to include resume id if it exists
    # resume: Optional[StudentResumeOut] 

    class Config:
        from_attributes = True


# --- Resume Schemas ---

class StudentResumeBase(BaseModel):
    career_objective: Optional[str] = None
    work_experience: Optional[str] = None # JSON String
    projects: Optional[str] = None # JSON String
    certifications: Optional[str] = None # JSON String
    extra_curricular: Optional[str] = None # JSON String
    resume_file_path: Optional[str] = None

class StudentResumeCreate(StudentResumeBase):
    pass

class StudentResumeUpdate(StudentResumeBase):
    pass

class StudentResumeOut(StudentResumeBase):
    id: int
    student_id: int

    class Config:
        from_attributes = True



# --- Baaki Skills aur Application wala part same rahega ---

class SkillCreate(BaseModel):
    name: str


class SkillOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class ApplicationCreate(BaseModel):
    internship_id: int


class ApplicationOut(BaseModel):
    id: int
    internship_id: int
    status: str
    applied_at: datetime

    class Config:
        from_attributes = True


class RecommendedInternship(BaseModel):
    internship_id: int
    title: str
    company_name: str
    match_score: float
    matching_skills: List[str]
    missing_skills: List[str]
    explanation: Dict[str, Any]  # Changed from str to Dict for detailed AI matching info
    status: str = "MATCHED"
    reason: Optional[str] = None
    rule_based_score: Optional[float] = None
    embedding_score: Optional[float] = None
    feedback_boost: float = 0.0
    cross_encoder_score: Optional[float] = None

    class Config:
        from_attributes = True

class FeedbackAction(BaseModel):
    internship_id: int
    action: str # view, click, apply, ignore