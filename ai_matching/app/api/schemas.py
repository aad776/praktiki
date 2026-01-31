from typing import Dict, List
from pydantic import BaseModel


class StudentSchema(BaseModel):
    id: int
    skills: Dict[str, int]
    year: int
    location: str
    preferences: Dict[str, str] = {}


class InternshipSchema(BaseModel):
    id: int
    required_skills: Dict[str, int]
    min_year: int
    location: str
    is_remote: bool


class MatchRequest(BaseModel):
    student: StudentSchema
    internship: InternshipSchema


class RecommendRequest(BaseModel):
    student: StudentSchema
    internships: List[InternshipSchema]
    top_n: int = 5
