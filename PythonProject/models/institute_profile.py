from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from db.session import Base


class InstituteProfile(Base):
    __tablename__ = "institute_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    institute_name = Column(String, nullable=False)
    aishe_code = Column(String, nullable=False)
    contact_number = Column(String, nullable=True)
    
    # New fields to match employer profile style
    description = Column(String, nullable=True)
    city = Column(String, nullable=True)
    website_url = Column(String, nullable=True)
    logo_url = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False)
    
    # Additional info
    institute_type = Column(String, nullable=True) # Govt, Private, etc.
    state = Column(String, nullable=True)

    __table_args__ = (UniqueConstraint("aishe_code", name="_aishe_code_uc"),)

    user = relationship("User", back_populates="institute_profile")
    students = relationship("StudentProfile", back_populates="institute")

