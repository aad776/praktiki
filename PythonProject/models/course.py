from sqlalchemy import Column, Integer, String, Table, ForeignKey
from sqlalchemy.orm import relationship
from db.session import Base

# Association table for College and Course
college_course_association = Table(
    "college_course",
    Base.metadata,
    Column("college_id", Integer, ForeignKey("colleges.id")),
    Column("course_id", Integer, ForeignKey("courses.id"))
)

class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    level = Column(String, nullable=True) # e.g., UG, PG, Diploma

    colleges = relationship("College", secondary=college_course_association, back_populates="courses")
    streams = relationship("Stream", back_populates="course")
