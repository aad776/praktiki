from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from db.session import Base

class EmployerProfile(Base):
    __tablename__ = "employer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    company_name = Column(String, nullable=False)
    contact_number = Column(String, nullable=False)
    designation = Column(String, nullable=True)
    organization_description = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    industry = Column(String, nullable=True)
    employee_count = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    website_url = Column(String, nullable=True)
    license_document_url = Column(String, nullable=True)
    social_media_link = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    # Verification fields moved to User model
    
    user = relationship("User", back_populates="employer_profile")
