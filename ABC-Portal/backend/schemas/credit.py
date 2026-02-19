from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from backend.schemas.user import UserResponse
from backend.schemas.internship import ApplicationResponse

class CreditRequestResponse(BaseModel):
    id: int
    student_id: int
    application_id: int
    hours: int
    credits_calculated: float
    policy_type: str
    status: str
    created_at: datetime
    student: Optional[UserResponse] = None
    application: Optional[ApplicationResponse] = None

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    action: str
    performed_by_id: int
    timestamp: datetime
    details: str

    class Config:
        from_attributes = True
