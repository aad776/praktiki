from pydantic import BaseModel, EmailStr
from typing import Optional, List

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


class InternshipOut(BaseModel):
    id: int
    employer_id: int
    title: str
    location: str
    mode: str
    duration_weeks: int

    class Config:
        from_attributes = True


class ApplicationStatusUpdate(BaseModel):
    status: str

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

    class Config:
        from_attributes = True
