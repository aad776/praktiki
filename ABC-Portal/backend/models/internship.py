from sqlalchemy import Column, Integer, String, ForeignKey, Enum, Float, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base
import enum

class InternshipStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"

class InternshipPolicy(str, enum.Enum):
    UGC = "UGC"
    AICTE = "AICTE"


class ApplicationStatus(str, enum.Enum):
    APPLIED = "applied"
    ACCEPTED = "accepted"  # Company Accepted
    INSTITUTE_REVIEW = "institute_review" # Institute verifying hours and awarding credits
    COMPLETED = "completed" # Credits awarded
    REJECTED = "rejected"
    EXCEPTION = "exception" # Low hours or missing proof

class Internship(Base):
    __tablename__ = "internships"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("employer_profiles.id"))
    title = Column(String, index=True)
    description = Column(String)
    status = Column(String, default="active")
    
    # Matching existing database schema
    location = Column(String)
    mode = Column(String)
    duration_weeks = Column(Integer)
    stipend_amount = Column(Integer)
    deadline = Column(String)
    start_date = Column(String)
    skills = Column(String)
    openings = Column(Integer)
    policy = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    employer = relationship("backend.models.user.EmployerProfile", back_populates="internships")

    @property
    def company_name(self):
        return self.employer.company_name if self.employer else None

    @property
    def company(self):
        return self.employer.user if self.employer and self.employer.user else None

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    internship_id = Column(Integer, ForeignKey("internships.id"))
    student_id = Column(Integer, ForeignKey("student_profiles.id"))
    status = Column(String, default=ApplicationStatus.APPLIED)
    hours_worked = Column(Integer, nullable=True)
    credits_awarded = Column(Float, nullable=True)
    policy_used = Column(String, nullable=True) # UGC or AICTE
    rejection_reason = Column(String, nullable=True)
    applied_at = Column(DateTime(timezone=True), server_default=func.now(), name="applied_at")

    internship = relationship("Internship", backref="applications")
    student = relationship("backend.models.user.StudentProfile", back_populates="applications")
