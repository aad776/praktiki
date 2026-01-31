from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from db.session import Base

class EmployerProfile(Base):
    __tablename__ = "employer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    company_name = Column(String, nullable=False)
    contact_number = Column(String, nullable=False)

    user = relationship("User", back_populates="employer_profile")