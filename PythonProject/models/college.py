from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from db.session import Base

class College(Base):
    __tablename__ = "colleges"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    state = Column(String, nullable=True)
    city = Column(String, nullable=True)

    courses = relationship("Course", secondary="college_course", back_populates="colleges")
