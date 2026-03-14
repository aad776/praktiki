from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from backend.schemas.user import UserResponse

class InternshipBase(BaseModel):
    title: str
    description: str
    location: Optional[str] = None
    mode: Optional[str] = None
    duration_weeks: Optional[int] = None
    stipend_amount: Optional[int] = None
    policy: Optional[str] = None
    start_date: Optional[str] = None
    deadline: Optional[str] = None

class InternshipCreate(InternshipBase):
    pass

class InternshipResponse(InternshipBase):
    id: int
    employer_id: Optional[int] = None
    status: str
    company_name: Optional[str] = None
    company: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class CreditShortResponse(BaseModel):
    id: int
    credits_calculated: float
    status: str
    class Config:
        from_attributes = True

class ApplicationBase(BaseModel):
    internship_id: int

class ApplicationCreate(ApplicationBase):
    pass

class StudentProfileResponse(BaseModel):
    id: int
    user: Optional[UserResponse] = None
    university_name: Optional[str] = None
    apaar_id: Optional[str] = None
    class Config:
        from_attributes = True

class ApplicationResponse(BaseModel):
    id: int
    internship_id: int
    student_id: int
    status: str
    hours_worked: Optional[int] = None
    credits_awarded: Optional[float] = None
    policy_used: Optional[str] = None
    rejection_reason: Optional[str] = None
    applied_at: Optional[datetime] = None
    internship: Optional[InternshipResponse] = None
    student: Optional[StudentProfileResponse] = None
    credit_request: List[CreditShortResponse] = []

    class Config:
        from_attributes = True


class CompletionRequest(BaseModel):
    hours: int

class RejectRequest(BaseModel):
    reason: str
