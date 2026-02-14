import enum
from sqlalchemy import Column, Integer, String, ForeignKey, Float, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base
from datetime import datetime

class CreditStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXCEPTION = "exception"

class CreditRequest(Base):
    __tablename__ = "credit_requests"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    hours = Column(Integer, nullable=False)
    credits_calculated = Column(Float, nullable=False)
    policy_type = Column(String, nullable=False) # UGC or AICTE
    status = Column(String, default="pending") # pending, approved, rejected, exception
    is_pushed_to_abc = Column(Boolean, default=False)
    remarks = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    student = relationship("backend.models.user.StudentProfile", backref="credit_requests")
    application = relationship("backend.models.internship.Application", backref="credit_request")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    performed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_type = Column(String, nullable=True) # internship, credit_request, etc.
    target_id = Column(Integer, nullable=True)
    details = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

    performed_by = relationship("backend.models.user.User")
