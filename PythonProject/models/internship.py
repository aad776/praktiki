from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from db.session import Base

class Internship(Base):
    __tablename__ = "internships"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("employer_profiles.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    location = Column(String, nullable=False)
    mode = Column(String, nullable=False) # remote, onsite, hybrid
    duration_weeks = Column(Integer, nullable=False)
    status = Column(String, default="active") # active, completed
    stipend_amount = Column(Integer, nullable=True)
    deadline = Column(String, nullable=True)
    start_date = Column(String, nullable=True)
    skills = Column(String, nullable=True) # Stored as comma-separated string
    openings = Column(Integer, default=1)
    qualifications = Column(String, nullable=True)
    benefits = Column(String, nullable=True)
    contact_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    application_link = Column(String, nullable=True)
    application_email = Column(String, nullable=True)

    # Relationship to employer
    employer = relationship("EmployerProfile", backref="internships")