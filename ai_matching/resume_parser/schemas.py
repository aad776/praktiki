"""
Pydantic schemas for Resume Parser
Type-safe data models for API requests/responses and evaluation
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
from datetime import datetime


# ---------------------------------------------------------------------------
# Domain models
# ---------------------------------------------------------------------------

class Experience(BaseModel):
    """Work experience entry"""
    company: Optional[str] = Field(None, description="Company name")
    position: Optional[str] = Field(None, description="Job title/position")
    duration: Optional[str] = Field(None, description="Duration (e.g., '2020-2022')")
    description: Optional[str] = Field(None, description="Role description")

    class Config:
        json_schema_extra = {
            "example": {
                "company": "Google Inc.",
                "position": "Software Engineer",
                "duration": "2020-2022",
                "description": "Developed scalable microservices"
            }
        }


class Education(BaseModel):
    """Education entry"""
    degree: Optional[str] = Field(None, description="Degree (e.g., B.Tech, M.S.)")
    institution: Optional[str] = Field(None, description="University / college name")
    year: Optional[str] = Field(None, description="Graduation year or date range")
    gpa: Optional[str] = Field(None, description="GPA / CGPA")
    field_of_study: Optional[str] = Field(None, description="Major / specialisation")

    class Config:
        json_schema_extra = {
            "example": {
                "degree": "B.Tech",
                "institution": "IIT Delhi",
                "year": "2022",
                "gpa": "8.5/10",
                "field_of_study": "Computer Science"
            }
        }


class Project(BaseModel):
    """Project entry"""
    title: Optional[str] = Field(None, description="Project title")
    description: Optional[str] = Field(None, description="Short description")
    technologies: List[str] = Field(default_factory=list, description="Technologies used")
    url: Optional[str] = Field(None, description="Link to project / repo")


class Certification(BaseModel):
    """Certification / course entry"""
    name: Optional[str] = Field(None, description="Certificate name")
    issuer: Optional[str] = Field(None, description="Issuing organisation")
    date: Optional[str] = Field(None, description="Date obtained")


class SectionInfo(BaseModel):
    """Metadata about a detected resume section."""
    label: str
    start_line: int
    end_line: int
    confidence: float = 1.0


class FieldConfidence(BaseModel):
    """Per-field extraction confidence."""
    name: float = Field(0.0, ge=0.0, le=1.0)
    email: float = Field(0.0, ge=0.0, le=1.0)
    phone: float = Field(0.0, ge=0.0, le=1.0)
    skills: float = Field(0.0, ge=0.0, le=1.0)
    experience: float = Field(0.0, ge=0.0, le=1.0)
    education: float = Field(0.0, ge=0.0, le=1.0)


# ---------------------------------------------------------------------------
# Main resume data model
# ---------------------------------------------------------------------------

class ResumeData(BaseModel):
    """Main structured resume data model"""
    name: Optional[str] = Field(None, description="Full name of the candidate")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    summary: Optional[str] = Field(None, description="Professional summary / career objective")
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL")
    github: Optional[str] = Field(None, description="GitHub profile URL")
    skills: List[str] = Field(default_factory=list, description="Extracted skills")
    skills_categorized: Optional[Dict[str, List[str]]] = Field(
        None, description="Skills grouped by domain"
    )
    experience: List[Experience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
    projects: List[Project] = Field(default_factory=list)
    certifications: List[Certification] = Field(default_factory=list)
    total_experience_years: Optional[float] = Field(None)
    detected_sections: List[SectionInfo] = Field(default_factory=list)
    confidence: Optional[FieldConfidence] = None
    detected_stacks: List[str] = Field(default_factory=list)
    raw_text: Optional[str] = Field(None, description="Raw extracted text (preview)")

    @validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v and '@' not in v:
            return None
        return v

    @validator('skills')
    @classmethod
    def deduplicate_skills(cls, v: List[str]) -> List[str]:
        seen: set[str] = set()
        unique: list[str] = []
        for skill in v:
            key = skill.lower()
            if key not in seen:
                seen.add(key)
                unique.append(skill)
        return unique


# ---------------------------------------------------------------------------
# API response
# ---------------------------------------------------------------------------

class ParseResponse(BaseModel):
    """API response wrapper for resume parsing"""
    success: bool = Field(..., description="Whether parsing was successful")
    data: Optional[ResumeData] = Field(None, description="Parsed resume data")
    error: Optional[str] = Field(None, description="Error message if parsing failed")
    processing_time_ms: Optional[float] = Field(None)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

class FieldMetrics(BaseModel):
    precision: float = Field(0.0, ge=0.0, le=1.0)
    recall: float = Field(0.0, ge=0.0, le=1.0)
    f1_score: float = Field(0.0, ge=0.0, le=1.0)
    accuracy: float = Field(0.0, ge=0.0, le=1.0)


class EvaluationMetrics(BaseModel):
    name_metrics: FieldMetrics
    email_metrics: FieldMetrics
    phone_metrics: FieldMetrics
    skills_metrics: FieldMetrics
    experience_metrics: FieldMetrics
    overall_accuracy: float = Field(0.0, ge=0.0, le=1.0)


class GroundTruth(BaseModel):
    filename: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
    education: List[Education] = Field(default_factory=list)
