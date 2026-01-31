from pydantic import BaseModel
from typing import List, Optional
class Student(BaseModel):
    id: int
    name: str
    year: int
    department: str
    skills: List[str]
    interests: List[str]
    preferred_location:str

class Internships(BaseModel):
    id: int
    title: str
    company: str
    location: str
    required_skills: List[str]
    mode: str

class Applications(BaseModel):
    id: int
    student_id: int
    internship_id: int
    status: str

class ApplyInternshipRequest(BaseModel):
    student_id: int
    internship_id: int