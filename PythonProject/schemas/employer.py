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

    class Config:
        from_attributes = True

class InternshipCreate(BaseModel):
    title: str
    description: Optional[str] = None
    location: str
    mode: str  # remote, onsite, hybrid
    duration_weeks: int


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
