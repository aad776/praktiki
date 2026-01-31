from pydantic import BaseModel, EmailStr
from typing import Optional, List

class EmployerCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    company_name: str
    contact_number: str

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