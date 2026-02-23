"""
Resume Parser Package
Production-grade resume parsing with section detection, relation extraction,
fuzzy skill matching, and hierarchical skill taxonomy.
"""
__version__ = "2.0.0"
__author__ = "Praktiki Team"

from .pdf_processor import PDFProcessor
from .entity_extractor import EntityExtractor
from .experience_extractor import ExperienceExtractor
from .skills_extractor import SkillsExtractor
from .education_extractor import EducationExtractor
from .section_detector import SectionDetector, SectionLabel, Section
from .segmented_processor import SegmentedProcessor
from .relation_extractor import RelationExtractor
from .schemas import (
    ResumeData, ParseResponse, Experience, Education,
    Project, Certification, SectionInfo, FieldConfidence,
)

__all__ = [
    "PDFProcessor",
    "EntityExtractor",
    "ExperienceExtractor",
    "SkillsExtractor",
    "EducationExtractor",
    "SectionDetector",
    "SectionLabel",
    "Section",
    "SegmentedProcessor",
    "RelationExtractor",
    "ResumeData",
    "ParseResponse",
    "Experience",
    "Education",
    "Project",
    "Certification",
    "SectionInfo",
    "FieldConfidence",
]
