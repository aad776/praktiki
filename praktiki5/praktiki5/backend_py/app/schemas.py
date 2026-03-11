from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from enum import Enum

# Verification Enums
class VerificationStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    FLAGGED = "FLAGGED"

class EligibilityStatus(str, Enum):
    NOT_CHECKED = "NOT_CHECKED"
    ELIGIBLE = "ELIGIBLE"
    REJECTED = "REJECTED"
    FLAGGED = "FLAGGED"

class CreditStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

# Auth Schemas
class StudentBase(BaseModel):
    name: str
    email: EmailStr

class StudentCreate(StudentBase):
    password: str
    role: str = "student"

class StudentLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict

class TokenData(BaseModel):
    id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None

# Certificate Schemas
class CertificateBase(BaseModel):
    student_id: str
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
    
    # Deprecated fields (kept for compatibility)
    hours: Optional[int] = None
    extracted_skills: Optional[Dict[str, Any]] = None
    mapped_skill_codes: Optional[List[str]] = None
    
    authenticity_score: float = 0.0
    qr_detected: bool = False
    verification_status: VerificationStatus = VerificationStatus.PENDING
    identity_verified: bool = False
    timeline_conflict: bool = False
    eligibility_status: EligibilityStatus = EligibilityStatus.NOT_CHECKED

class CertificateCreate(CertificateBase):
    pass

class CertificateResponse(CertificateBase):
    id: str
    fraud_flag: bool
    created_at: datetime
    
    # Detailed verification results for UI
    verification_summary: Optional[Dict[str, Any]] = None
    
    # We need to include student info for Admin/Institute view
    student: Optional[StudentBase] = None

    class Config:
        from_attributes = True

# Taxonomy Schemas (Deprecated in logic, kept for schema compatibility)
class TaxonomySkillBase(BaseModel):
    skill_name: str
    taxonomy_code: str
    domain: str

class TaxonomySkillCreate(TaxonomySkillBase):
    pass

class TaxonomySkillResponse(TaxonomySkillBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Structured Credit Object for Engine
class StructuredCreditData(BaseModel):
    student_id: str
    certificate_id: str
    organization_name: Optional[str]
    internship_title: Optional[str]
    duration_in_months: Optional[int]
    total_hours: Optional[int]
    performance_remark: Optional[str]
    authenticity_score: float
    eligibility_status: EligibilityStatus

# Credit Request Schemas
class CreditRequestBase(BaseModel):
    certificate_id: str

class CreditRequestCreate(CreditRequestBase):
    pass

class CreditRequestResponse(BaseModel):
    id: str
    student_id: str
    certificate_id: str
    internship_title: Optional[str]
    organization_name: Optional[str]
    duration_in_months: Optional[int]
    total_hours: Optional[int]
    performance_remark: Optional[str]
    authenticity_score: float
    status: CreditStatus
    institute_comment: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    # We can include student info for the institute view
    student: Optional[StudentBase] = None

    class Config:
        from_attributes = True

class CreditReviewRequest(BaseModel):
    status: CreditStatus
    institute_comment: Optional[str] = None

    @field_validator('institute_comment')
    @classmethod
    def check_rejection_reason(cls, v, info):
        if info.data.get('status') == CreditStatus.REJECTED and not v:
            raise ValueError('Rejection reason (institute_comment) is required when rejecting.')
        return v

class StudentCreditRequestView(BaseModel):
    internship_title: Optional[str]
    organization_name: Optional[str]
    total_hours: Optional[int]
    status: CreditStatus
    institute_comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationResponse(BaseModel):
    id: str
    message: str
    read_status: bool
    created_at: datetime

    class Config:
        from_attributes = True

