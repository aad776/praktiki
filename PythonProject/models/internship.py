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

    # Relationship to employer
    employer = relationship("EmployerProfile", backref="internships")