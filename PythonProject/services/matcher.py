"""
Matcher Service
AI-powered student-internship matching engine
"""
from typing import List, Dict, Set, Any, Optional
from .vectorizer import vectorizer


class Matcher:
    """Service for matching students to internships using AI"""
    
    # Weight configuration for match scoring
    REQUIRED_SKILLS_WEIGHT = 0.50
    OPTIONAL_SKILLS_WEIGHT = 0.20
    VECTOR_SIMILARITY_WEIGHT = 0.20
    PREFERENCE_WEIGHT = 0.10
    
    def compute_match_score(
        self,
        student_skills: Set[str],
        required_skills: Set[str],
        optional_skills: Set[str],
        student_vector: Optional[List[float]] = None,
        internship_vector: Optional[List[float]] = None,
        student_preferences: Optional[Dict] = None,
        internship_details: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Compute comprehensive match score between student and internship
        
        Args:
            student_skills: Set of student's skill names (lowercase)
            required_skills: Set of required skill names for internship
            optional_skills: Set of optional skill names for internship
            student_vector: Student's skill embedding vector (optional)
            internship_vector: Internship's skill embedding vector (optional)
            student_preferences: Student's location/mode preferences (optional)
            internship_details: Internship location/mode details (optional)
        
        Returns:
            Dictionary with match score and breakdown
        """
        # Normalize skill names
        student_skills = {s.lower() for s in student_skills}
        required_skills = {s.lower() for s in required_skills}
        optional_skills = {s.lower() for s in optional_skills}
        
        # Calculate required skills match (50%)
        if required_skills:
            required_match = len(student_skills & required_skills) / len(required_skills)
        else:
            required_match = 1.0
        
        # Calculate optional skills match (20%)
        if optional_skills:
            optional_match = len(student_skills & optional_skills) / len(optional_skills)
        else:
            optional_match = 1.0
        
        # Calculate vector similarity (20%)
        vector_similarity = 0.5  # Default middle ground
        if student_vector and internship_vector:
            vector_similarity = vectorizer.compute_similarity(
                student_vector, 
                internship_vector
            )
        
        # Calculate preference match (10%)
        preference_match = 0.5  # Default middle ground
        if student_preferences and internship_details:
            preference_match = self._calculate_preference_match(
                student_preferences, 
                internship_details
            )
        
        # Calculate final weighted score
        final_score = (
            self.REQUIRED_SKILLS_WEIGHT * required_match +
            self.OPTIONAL_SKILLS_WEIGHT * optional_match +
            self.VECTOR_SIMILARITY_WEIGHT * vector_similarity +
            self.PREFERENCE_WEIGHT * preference_match
        ) * 100
        
        # Identify skill gaps
        skill_gaps = list(required_skills - student_skills)
        
        return {
            "match_score": round(final_score, 2),
            "required_match": round(required_match * 100, 2),
            "optional_match": round(optional_match * 100, 2),
            "vector_similarity": round(vector_similarity * 100, 2),
            "preference_match": round(preference_match * 100, 2),
            "skill_gaps": skill_gaps,
            "matched_required": list(student_skills & required_skills),
            "matched_optional": list(student_skills & optional_skills),
            "status": "MATCHED" if final_score > 30 else "LOW_MATCH"
        }
    
    def _calculate_preference_match(
        self, 
        student_prefs: Dict, 
        internship_details: Dict
    ) -> float:
        """Calculate how well internship matches student preferences"""
        score = 0.0
        factors = 0
        
        # Location match
        if "location" in student_prefs and "location" in internship_details:
            if student_prefs["location"].lower() in internship_details["location"].lower():
                score += 1.0
            factors += 1
        
        # Work mode match
        if "work_mode" in student_prefs and "mode" in internship_details:
            student_modes = [m.strip().lower() for m in student_prefs["work_mode"].split(",")]
            if internship_details["mode"].lower() in student_modes:
                score += 1.0
            factors += 1
        
        return score / factors if factors > 0 else 0.5
    
    def rank_recommendations(
        self,
        matches: List[Dict],
        top_n: int = 10
    ) -> List[Dict]:
        """
        Rank and return top N internship recommendations
        
        Args:
            matches: List of match result dictionaries
            top_n: Number of top recommendations to return
        
        Returns:
            Sorted list of top recommendations
        """
        # Sort by match score descending
        sorted_matches = sorted(
            matches, 
            key=lambda x: x.get("match_score", 0), 
            reverse=True
        )
        
        return sorted_matches[:top_n]


# Singleton instance
matcher = Matcher()
