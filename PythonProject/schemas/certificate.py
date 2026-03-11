from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

class VerificationStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    FLAGGED = "FLAGGED"

class EligibilityStatus(str, Enum):
    NOT_CHECKED = "NOT_CHECKED"
    ELIGIBLE = "ELIGIBLE"
    REJECTED = "REJECTED"
    FLAGGED = "FLAGGED"

class CertificateBase(BaseModel):
    application_id: Optional[int] = None
    file_url: str
    has_qr: bool = False
    extracted_data: Optional[str] = None
    
    # Real-world verification fields
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_in_months: Optional[int] = None
    total_hours: Optional[int] = None
    internship_title: Optional[str] = None
    organization_name: Optional[str] = None
    performance_remark: Optional[str] = None
    
    authenticity_score: float = 0.0
    qr_detected: bool = False
    verification_status: VerificationStatus = VerificationStatus.PENDING
    identity_verified: bool = False
    timeline_conflict: bool = False
    eligibility_status: EligibilityStatus = EligibilityStatus.NOT_CHECKED

class CertificateCreate(CertificateBase):
    pass

class CertificateResponse(CertificateBase):
    id: int
    student_id: int
    student_name: Optional[str] = None
    fraud_flag: bool
    created_at: datetime
    verification_summary: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)
