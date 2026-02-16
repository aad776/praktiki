from sqlalchemy import Column, Integer, String, ForeignKey,Boolean,Text, DateTime
from db.session import Base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

class StudentProfile(Base):
    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    institute_id = Column(Integer, ForeignKey("institute_profiles.id"), nullable=True)
    year = Column(Integer, nullable=True)
    preferred_location = Column(String, nullable=True)
    
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    
    current_city = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    languages = Column(String, nullable=True)  # Comma separated

    profile_type = Column(String, nullable=True)  # College student, Fresher, etc.
    university_name = Column(String, nullable=True)
    degree = Column(String, nullable=True)  # Course
    department = Column(String, nullable=True) # Stream
    start_year = Column(Integer, nullable=True)
    end_year = Column(Integer, nullable=True)
    
    # APAAR ID - Automated Permanent Academic Account Registry (12-digit unique ID)
    apaar_id = Column(String(12), nullable=True)
    is_apaar_verified = Column(Boolean, default=False)
    full_name = Column(String, nullable=True)
    
    cgpa = Column(String, nullable=True)
    skills = Column(Text, nullable=True)
    interests = Column(Text, nullable=True) # Areas of interest
    projects = Column(Text, nullable=True)
    
    looking_for = Column(String, nullable=True) # Jobs, Internships
    work_mode = Column(String, nullable=True) # In-office, WFH

    # Relationships
    user = relationship("User", back_populates="student_profile")
    institute = relationship("InstituteProfile", back_populates="students")
    resume = relationship("StudentResume", back_populates="student", uselist=False)
    applications = relationship("Application", back_populates="student")


class StudentResume(Base):
    __tablename__ = "student_resumes"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("student_profiles.id"), unique=True, nullable=False)
    
    # Store JSON strings for complex lists to avoid creating too many sub-tables for now
    # We can use Pydantic to validate the structure before saving
    career_objective = Column(Text, nullable=True)
    
    # JSON strings: [{"title": "...", "company": "...", "start_date": "...", "end_date": "...", "description": "..."}]
    work_experience = Column(Text, nullable=True) 
    
    # JSON strings: [{"title": "...", "description": "...", "link": "..."}]
    projects = Column(Text, nullable=True)
    
    # JSON strings: [{"name": "...", "description": "..."}]
    certifications = Column(Text, nullable=True)
    
    # JSON strings: [{"name": "...", "level": "..."}]
    extra_curricular = Column(Text, nullable=True)
    
    # File path for uploaded resume
    resume_file_path = Column(String, nullable=True)
    resume_filename = Column(String, nullable=True)
    resume_file_size = Column(Integer, nullable=True) # In bytes
    resume_uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Additional fields used by frontend resume builder
    education_entries = Column(Text, nullable=True)  # JSON string
    skills_categorized = Column(Text, nullable=True)  # JSON string { technical: [], soft: [], languages: [] }
    title = Column(String, nullable=True)
    linkedin = Column(String, nullable=True)
    profile_picture = Column(String, nullable=True)
    
    student = relationship("StudentProfile", back_populates="resume")
    history = relationship("StudentResumeHistory", back_populates="resume", cascade="all, delete-orphan")


class StudentResumeHistory(Base):
    __tablename__ = "student_resume_history"

    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("student_resumes.id"), nullable=False)
    
    file_path = Column(String, nullable=False)
    filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    resume = relationship("StudentResume", back_populates="history")
