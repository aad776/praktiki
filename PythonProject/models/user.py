from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship  # <--- Ye import zaroor chahiye
from sqlalchemy.sql import func
from db.session import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, default="student")
    is_email_verified = Column(Boolean, default=False)
    is_phone_verified = Column(Boolean, default=False)
    phone_number = Column(String, nullable=True)
    
    email_otp_code = Column(String, nullable=True)
    email_otp_expires = Column(DateTime(timezone=True), nullable=True)
    phone_otp_code = Column(String, nullable=True)
    phone_otp_expires = Column(DateTime(timezone=True), nullable=True)
    
    verification_token = Column(String, nullable=True)
    verification_token_expires = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)

    employer_profile = relationship("EmployerProfile", back_populates="user", uselist=False)

    institute_profile = relationship("InstituteProfile", back_populates="user", uselist=False)
