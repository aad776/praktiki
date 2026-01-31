from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from db.session import Base


class InstituteProfile(Base):
    __tablename__ = "institute_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    institute_name = Column(String, nullable=False)
    aishe_code = Column(String, nullable=False)
    contact_number = Column(String, nullable=False)

    __table_args__ = (UniqueConstraint("aishe_code", name="_aishe_code_uc"),)

    user = relationship("User", back_populates="institute_profile")
    students = relationship("StudentProfile", back_populates="institute")

