"""
Skill Extractor Service
Uses NLP to extract skills from CV text
"""
from typing import List, Dict, Tuple
import re


class SkillExtractor:
    """Service for extracting skills from CV text using NLP"""
    
    # Common programming languages and technologies
    TECH_SKILLS = {
        "python", "javascript", "java", "c++", "c#", "ruby", "go", "rust", "swift",
        "kotlin", "typescript", "php", "scala", "r", "matlab", "sql", "html", "css",
        "react", "angular", "vue", "node.js", "django", "flask", "fastapi", "spring",
        "express", "nextjs", "tensorflow", "pytorch", "keras", "scikit-learn",
        "pandas", "numpy", "docker", "kubernetes", "aws", "azure", "gcp", "git",
        "mongodb", "postgresql", "mysql", "redis", "elasticsearch", "graphql",
        "rest api", "microservices", "machine learning", "deep learning", "nlp",
        "computer vision", "data analysis", "data science", "devops", "ci/cd",
        "agile", "scrum", "jira", "figma", "adobe xd", "photoshop", "illustrator"
    }
    
    # Soft skills keywords
    SOFT_SKILLS = {
        "communication", "leadership", "teamwork", "problem solving", "critical thinking",
        "time management", "project management", "presentation", "negotiation",
        "conflict resolution", "adaptability", "creativity", "collaboration",
        "attention to detail", "analytical", "decision making", "interpersonal"
    }
    
    def __init__(self):
        self._nlp = None
    
    @property
    def nlp(self):
        """Lazy load spaCy model"""
        if self._nlp is None:
            try:
                import spacy
                self._nlp = spacy.load("en_core_web_sm")
            except ImportError:
                raise ImportError("spaCy is required. Install with: pip install spacy && python -m spacy download en_core_web_sm")
        return self._nlp
    
    def extract_skills_keyword_matching(self, text: str) -> List[Dict]:
        """Extract skills using keyword matching against known skill sets"""
        text_lower = text.lower()
        found_skills = []
        
        # Match technical skills
        for skill in self.TECH_SKILLS:
            if skill in text_lower or skill.replace(" ", "") in text_lower.replace(" ", ""):
                found_skills.append({
                    "name": skill,
                    "category": "technical",
                    "confidence": 0.9,
                    "source": "keyword_match"
                })
        
        # Match soft skills
        for skill in self.SOFT_SKILLS:
            if skill in text_lower:
                found_skills.append({
                    "name": skill,
                    "category": "soft_skill",
                    "confidence": 0.7,
                    "source": "keyword_match"
                })
        
        return found_skills
    
    def extract_skills_ner(self, text: str) -> List[Dict]:
        """Extract skills using Named Entity Recognition (NER)"""
        try:
            doc = self.nlp(text)
            skills = []
            
            # Extract named entities that might be skills
            for ent in doc.ents:
                if ent.label_ in ("ORG", "PRODUCT", "WORK_OF_ART"):
                    # Check if entity matches known skills
                    if ent.text.lower() in self.TECH_SKILLS:
                        skills.append({
                            "name": ent.text.lower(),
                            "category": "technical",
                            "confidence": 0.85,
                            "source": "ner"
                        })
            
            return skills
        except Exception:
            return []
    
    def extract_skills(self, text: str) -> List[Dict]:
        """
        Extract all skills from CV text using multiple methods
        
        Args:
            text: CV text content
        
        Returns:
            List of skill dictionaries with name, category, and confidence
        """
        # Combine results from both methods
        keyword_skills = self.extract_skills_keyword_matching(text)
        ner_skills = self.extract_skills_ner(text)
        
        # Merge and deduplicate
        seen_skills = set()
        all_skills = []
        
        for skill in keyword_skills + ner_skills:
            skill_name = skill["name"].lower()
            if skill_name not in seen_skills:
                seen_skills.add(skill_name)
                all_skills.append(skill)
        
        # Sort by confidence
        all_skills.sort(key=lambda x: x["confidence"], reverse=True)
        
        return all_skills


# Singleton instance
skill_extractor = SkillExtractor()
