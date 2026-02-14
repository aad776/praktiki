from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class EmployerCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    company_name: str
    contact_number: str

class EmployerProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    contact_number: Optional[str] = None
    designation: Optional[str] = None
    organization_description: Optional[str] = None
    city: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    license_document_url: Optional[str] = None
    social_media_link: Optional[str] = None
    is_verified: Optional[bool] = None

class EmployerProfileOut(BaseModel):
    id: int
    user_id: int
    company_name: str
    contact_number: str
    designation: Optional[str] = None
    organization_description: Optional[str] = None
    city: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[str] = None
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    license_document_url: Optional[str] = None
    social_media_link: Optional[str] = None
    is_verified: bool = False
    # Note: is_phone_verified and is_email_verified are on User model, returned via /profile endpoint

    class Config:
        from_attributes = True

class InternshipCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: str
    mode: str  # remote, onsite, hybrid
    duration_weeks: int
    stipend_amount: Optional[float] = None
    deadline: Optional[str] = None
    start_date: Optional[str] = None
    skills: Optional[List[str]] = None
    openings: Optional[int] = 1
    qualifications: Optional[str] = None
    benefits: Optional[List[str]] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    application_link: Optional[str] = None
    application_email: Optional[str] = None
    policy: Optional[str] = "UGC"


class InternshipOut(BaseModel):
    id: int
    employer_id: int
    title: str
    description: Optional[str] = None
    location: str
    mode: str
    duration_weeks: int
    deadline: Optional[str] = None
    skills: Optional[str] = None
    policy: Optional[str] = None
    created_at: Optional[datetime] = None
    company_name: Optional[str] = None
    logo_url: Optional[str] = None

    class Config:
        from_attributes = True


class ApplicationStatusUpdate(BaseModel):
    status: str

class ApplicationComplete(BaseModel):
    hours_worked: int
    policy_type: str  # UGC or AICTE

class BulkApplicationStatusUpdate(BaseModel):
    application_ids: List[int]
    status: str

class DashboardMetrics(BaseModel):
    total_applicants: int
    completed_internships: int
    accepted_applications: int
    rejected_applications: int
    ongoing_programs: int

class ApplicationOut(BaseModel):
    id: int
    student_id: int
    internship_id: int
    status: str
    applied_at: str
    student_name: Optional[str] = None
    internship_title: Optional[str] = None
    university_name: Optional[str] = None
    course: Optional[str] = None
    skills: Optional[str] = None
    resume_url: Optional[str] = None

    class Config:
        from_attributes = True

class StudentShortOut(BaseModel):
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    university_name: Optional[str] = None
    skills: Optional[str] = None
    resume_file_path: Optional[str] = None
    resume_filename: Optional[str] = None
    resume_file_size: Optional[int] = None
    resume_uploaded_at: Optional[datetime] = None
    resume_json: Optional[str] = None # Added for career_objective, work_experience, etc.

    class Config:
        from_attributes = True

class ApplicationWithStudentOut(BaseModel):
    id: int
    internship_id: int
    status: str
    applied_at: Optional[datetime] = None
    student: Optional[StudentShortOut] = None
    # We can also add these here directly if mapping from ORM is tricky
    resume_file_path: Optional[str] = None
    resume_json: Optional[str] = None

    class Config:
        from_attributes = True
