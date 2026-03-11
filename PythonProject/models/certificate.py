from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Float, Date, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db.session import Base

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=True) # Linked internship application
    student_name = Column(String, nullable=True) # Automatically attached from user profile
    file_url = Column(String, nullable=False)
    has_qr = Column(Boolean, default=False)
    extracted_data = Column(Text, nullable=True)  # JSON string
    
    # Verification fields
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    duration_in_months = Column(Integer, nullable=True)
    total_hours = Column(Integer, nullable=True)
    internship_title = Column(String, nullable=True)
    organization_name = Column(String, nullable=True)
    performance_remark = Column(String, nullable=True)
    
    authenticity_score = Column(Float, default=0.0)
    qr_detected = Column(Boolean, default=False)
    verification_status = Column(String, default="PENDING") # PENDING, VERIFIED, FLAGGED
    identity_verified = Column(Boolean, default=False)
    timeline_conflict = Column(Boolean, default=False)
    eligibility_status = Column(String, default="NOT_CHECKED") # NOT_CHECKED, ELIGIBLE, REJECTED, FLAGGED
    verification_summary = Column(JSON, nullable=True) # Detailed results for UI
    
    fraud_flag = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("StudentProfile", backref="certificates")
    application = relationship("Application", backref="certificate", uselist=False)
