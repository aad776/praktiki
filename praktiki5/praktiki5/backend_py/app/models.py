from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Text, Float, Date, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base

class Student(Base):
    __tablename__ = "Student"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="student")
    abc_id = Column(String, unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    certificates = relationship("Certificate", back_populates="student")

class Organization(Base):
    __tablename__ = "Organization"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    domain = Column(String, unique=True, nullable=False)
    is_whitelisted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Certificate(Base):
    __tablename__ = "Certificate"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, ForeignKey("Student.id"), nullable=False)
    file_url = Column(String, nullable=False)
    has_qr = Column(Boolean, default=False)
    extracted_data = Column(Text, nullable=True)  # JSON string
    
    # Updated verification fields
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    duration_in_months = Column(Integer, nullable=True)
    total_hours = Column(Integer, nullable=True)
    internship_title = Column(String, nullable=True)
    organization_name = Column(String, nullable=True)
    performance_remark = Column(String, nullable=True)
    
    # Deprecated fields (kept for DB compatibility)
    hours = Column(Integer, nullable=True)
    extracted_skills = Column(JSON, nullable=True)
    mapped_skill_codes = Column(JSON, nullable=True)
    
    authenticity_score = Column(Float, default=0.0)
    qr_detected = Column(Boolean, default=False)
    verification_status = Column(String, default="PENDING") # PENDING, VERIFIED, FLAGGED
    identity_verified = Column(Boolean, default=False)
    timeline_conflict = Column(Boolean, default=False)
    eligibility_status = Column(String, default="NOT_CHECKED") # NOT_CHECKED, ELIGIBLE, REJECTED, FLAGGED
    verification_summary = Column(JSON, nullable=True) # Detailed results for UI
    
    fraud_flag = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="certificates")
    credit_requests = relationship("CreditRequest", back_populates="certificate")

class CreditRequest(Base):
    __tablename__ = "CreditRequest"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, ForeignKey("Student.id"), nullable=False)
    certificate_id = Column(String, ForeignKey("Certificate.id"), nullable=False)
    
    # Snapshot of certificate data to avoid direct access to Certificate table by institute
    internship_title = Column(String, nullable=True)
    organization_name = Column(String, nullable=True)
    duration_in_months = Column(Integer, nullable=True)
    total_hours = Column(Integer, nullable=True)
    performance_remark = Column(String, nullable=True)
    authenticity_score = Column(Float, default=0.0)
    
    status = Column(String, default="PENDING") # PENDING, APPROVED, REJECTED
    institute_comment = Column(String, nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    certificate = relationship("Certificate", back_populates="credit_requests")
    student = relationship("Student")
    ledger_entry = relationship("AcademicCreditLedger", back_populates="credit_request", uselist=False)

class AcademicCreditLedger(Base):
    __tablename__ = "AcademicCreditLedger"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    student_id = Column(String, ForeignKey("Student.id"), nullable=False)
    credit_request_id = Column(String, ForeignKey("CreditRequest.id"), nullable=False, unique=True)
    
    # Structured Academic Record Object Fields
    institute_id = Column(String, nullable=False, default="INST-001") # Default placeholder
    internship_title = Column(String, nullable=False)
    total_hours = Column(Integer, nullable=False)
    credit_value = Column(Float, nullable=False)
    approval_timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Metadata for future API integration
    abc_transaction_id = Column(String, nullable=True) # For future blockchain/API integration
    is_synced_to_abc = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student")
    credit_request = relationship("CreditRequest", back_populates="ledger_entry")

class TaxonomySkill(Base):
    __tablename__ = "taxonomy_skills"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    skill_name = Column(String, nullable=False, unique=True)
    taxonomy_code = Column(String, nullable=False, unique=True)
    domain = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "AuditLog"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    action_type = Column(String, nullable=False) # UPLOAD, VERIFY, REQUEST, APPROVE, REJECT
    performed_by = Column(String, nullable=False) # user_id
    performed_by_role = Column(String, nullable=False) # student, institute
    reference_id = Column(String, nullable=False) # certificate_id or credit_request_id
    timestamp = Column(DateTime, default=datetime.utcnow)
    details = Column(JSON, nullable=True) # Optional extra info

class Notification(Base):
    __tablename__ = "Notification"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("Student.id"), nullable=False)
    message = Column(String, nullable=False)
    read_status = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("Student")


