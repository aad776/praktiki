from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.database import Base

class UserRole:
    STUDENT = "student"
    EMPLOYER = "employer"
    INSTITUTE = "institute"
    ADMIN = "admin"

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
    
    apaar_id = Column(String(12), unique=True, nullable=True, index=True)
    is_apaar_verified = Column(Boolean, default=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student_profile = relationship("StudentProfile", back_populates="user", uselist=False)
    employer_profile = relationship("EmployerProfile", back_populates="user", uselist=False)
    institute_profile = relationship("InstituteProfile", back_populates="user", uselist=False)

class LoginHistory(Base):
    __tablename__ = "login_history"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    login_at = Column(DateTime, default=func.now())

class StudentProfile(Base):
    __tablename__ = "student_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    institute_id = Column(Integer, ForeignKey("institute_profiles.id"), nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    university_name = Column(String, nullable=True)
    apaar_id = Column(String(12), nullable=True)
    is_apaar_verified = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="student_profile")
    institute = relationship("InstituteProfile", back_populates="students")
    applications = relationship("backend.models.internship.Application", back_populates="student")

class InstituteProfile(Base):
    __tablename__ = "institute_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    institute_name = Column(String, nullable=False)
    
    user = relationship("User", back_populates="institute_profile")
    students = relationship("StudentProfile", back_populates="institute")

class EmployerProfile(Base):
    __tablename__ = "employer_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    company_name = Column(String, nullable=False)
    
    user = relationship("User", back_populates="employer_profile")
    internships = relationship("backend.models.internship.Internship", back_populates="employer")

