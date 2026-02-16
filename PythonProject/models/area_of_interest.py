from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from db.session import Base

class AreaOfInterest(Base):
    __tablename__ = "areas_of_interest"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    stream_id = Column(Integer, ForeignKey("streams.id"), nullable=True)
    course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    
    stream = relationship("Stream")
    course = relationship("Course")
