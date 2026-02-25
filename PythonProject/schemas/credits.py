from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CreditRequestCreate(BaseModel):
    application_id: int
    hours: int
    policy_type: str # UGC or AICTE

class CreditRequestOut(BaseModel):
    id: int
    student_id: int
    application_id: int
    hours: int
    credits_calculated: float
    policy_type: str
    status: str
    created_at: datetime
    is_pushed_to_abc: Optional[bool] = False
    student_name: Optional[str] = None
    internship_title: Optional[str] = None
    company_name: Optional[str] = None

    class Config:
        from_attributes = True

class AuditLogOut(BaseModel):
    id: int
    action: str
    performed_by_id: int
    target_type: Optional[str]
    target_id: Optional[int]
    details: Optional[str]
    timestamp: datetime

    class Config:
        from_attributes = True

class CreditSummary(BaseModel):
    total_credits: float
    approved_credits: float
    pending_credits: float
    total_hours: int
