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
    student: Optional[UserResponse] = None
    # application: Optional[ApplicationResponse] = None # Avoid circular ref if possible, or use forward ref

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
