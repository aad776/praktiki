"""
Pydantic schemas for Resume Parser
Type-safe data models for API requests/responses and evaluation
"""
from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
from datetime import datetime


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


class ResumeData(BaseModel):
    """Main structured resume data model"""
    name: Optional[str] = Field(None, description="Full name of the candidate")
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    skills: List[str] = Field(default_factory=list, description="Extracted skills")
    experience: List[Experience] = Field(default_factory=list, description="Work experience entries")
    raw_text: Optional[str] = Field(None, description="Raw extracted text")

    @validator('email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        """Basic email validation"""
        if v and '@' not in v:
            return None
        return v

    @validator('skills')
    @classmethod
    def deduplicate_skills(cls, v: List[str]) -> List[str]:
        """Remove duplicate skills while preserving order"""
        seen = set()
        unique_skills = []
        for skill in v:
            skill_lower = skill.lower()
            if skill_lower not in seen:
                seen.add(skill_lower)
                unique_skills.append(skill)
        return unique_skills

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Doe",
                "email": "john.doe@example.com",
                "phone": "+1-555-123-4567",
                "skills": ["Python", "FastAPI", "Docker", "AWS"],
                "experience": [
                    {
                        "company": "Tech Corp",
                        "position": "Senior Engineer",
                        "duration": "2020-Present",
                        "description": "Led backend development"
                    }
                ]
            }
        }


class ParseResponse(BaseModel):
    """API response wrapper for resume parsing"""
    success: bool = Field(..., description="Whether parsing was successful")
    data: Optional[ResumeData] = Field(None, description="Parsed resume data")
    error: Optional[str] = Field(None, description="Error message if parsing failed")
    processing_time_ms: Optional[float] = Field(None, description="Processing time in milliseconds")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "name": "John Doe",
                    "email": "john.doe@example.com",
                    "phone": "+1-555-123-4567",
                    "skills": ["Python", "FastAPI"],
                    "experience": []
                },
                "error": None,
                "processing_time_ms": 1234.56,
                "timestamp": "2026-02-16T10:00:00"
            }
        }


class FieldMetrics(BaseModel):
    """Metrics for a single field"""
    precision: float = Field(0.0, ge=0.0, le=1.0)
    recall: float = Field(0.0, ge=0.0, le=1.0)
    f1_score: float = Field(0.0, ge=0.0, le=1.0)
    accuracy: float = Field(0.0, ge=0.0, le=1.0)


class EvaluationMetrics(BaseModel):
    """Comprehensive evaluation metrics"""
    name_metrics: FieldMetrics
    email_metrics: FieldMetrics
    phone_metrics: FieldMetrics
    skills_metrics: FieldMetrics
    experience_metrics: FieldMetrics
    overall_accuracy: float = Field(0.0, ge=0.0, le=1.0)
    
    class Config:
        json_schema_extra = {
            "example": {
                "name_metrics": {"precision": 0.95, "recall": 0.95, "f1_score": 0.95, "accuracy": 0.95},
                "email_metrics": {"precision": 1.0, "recall": 1.0, "f1_score": 1.0, "accuracy": 1.0},
                "phone_metrics": {"precision": 0.90, "recall": 0.85, "f1_score": 0.87, "accuracy": 0.87},
                "skills_metrics": {"precision": 0.88, "recall": 0.92, "f1_score": 0.90, "accuracy": 0.90},
                "experience_metrics": {"precision": 0.85, "recall": 0.80, "f1_score": 0.82, "accuracy": 0.82},
                "overall_accuracy": 0.89
            }
        }


class GroundTruth(BaseModel):
    """Ground truth data for evaluation"""
    filename: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    experience: List[Experience] = Field(default_factory=list)
