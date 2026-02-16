from sqlalchemy import Column, Integer, ForeignKey, String, DateTime, Float
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db.session import Base

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=False)
    status = Column(String, default="pending") # pending, accepted, rejected, completed, institute_review, exception
    hours_worked = Column(Integer, nullable=True)
    policy_used = Column(String, nullable=True) # UGC or AICTE
    credits_awarded = Column(Float, nullable=True)
    rejection_reason = Column(String, nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("StudentProfile", back_populates="applications")
    internship = relationship("Internship", back_populates="applications")