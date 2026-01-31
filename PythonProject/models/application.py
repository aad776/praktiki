from sqlalchemy import Column, Integer, ForeignKey, String, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from db.session import Base

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), nullable=False)
    internship_id = Column(Integer, ForeignKey("internships.id"), nullable=False)
    status = Column(String, default="pending") # pending, accepted, rejected
    applied_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student = relationship("StudentProfile", backref="applications")