from sqlalchemy.orm import Session
from models.student_profile import StudentProfile
from models.student_skills import StudentSkill
from models.skill import Skill
from models.internship import Internship
from models.internship_skills import InternshipSkill
from typing import List, Dict, Any
import time

class AIService:
    def __init__(self):
        # Lazy load hybrid matcher
        self._hybrid_matcher = None
        
        # Cache for recommendations (student_id: (timestamp, recommendations))
        self._recommendations_cache = {}
        # Cache duration: 24 hours in seconds
        self._CACHE_DURATION = 24 * 60 * 60
        self._synonyms_map = {
            "web development": ["HTML", "CSS", "JavaScript", "React", "Node.js"],
            "machine learning": ["Machine Learning", "Python"],
            "data science": ["Data Science", "Python", "SQL"],
            "cloud computing": ["AWS", "Azure", "Google Cloud"],
            "business analytics": ["Excel", "Power BI", "Tableau"],
            "digital marketing": ["Digital Marketing", "SEO", "Social Media Marketing"],
            "graphic design": ["Graphic Design"],
            "ui/ux design": ["UI/UX Design"],
            "database management": ["SQL", "MySQL", "PostgreSQL"],
            "project management": ["Project Management", "Agile", "Scrum"],
            "financial analysis": ["Financial Analysis", "Excel"],
            "content writing": ["Content Writing"],
            "networking": ["AWS"],
            "python": ["Python"],
            "java": ["Java"],
            "c++": ["C++"],
            "react": ["React"],
            "javascript": ["JavaScript"],
            "sql": ["SQL"]
        }
    
    def get_student_skills(self, db: Session, student_id: int) -> List[str]:
        # Fetch skills from StudentSkill table
        skills = db.query(Skill.name).join(StudentSkill).filter(StudentSkill.student_id == student_id).all()
        skill_names = [s[0] for s in skills]
        
        # Also include interests from profile as potential skills/keywords
        profile = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
        if profile:
            if profile.interests:
                interests = [i.strip() for i in profile.interests.split(",") if i.strip()]
                skill_names.extend(interests)
            
            # Also include skills from the text column if populated
            if profile.skills:
                profile_skills = [s.strip() for s in profile.skills.split(",") if s.strip()]
                skill_names.extend(profile_skills)
            
            # If no skills yet, use department as a fallback skill
            if not skill_names and profile.department:
                skill_names.append(profile.department)
        
        enriched = list(skill_names)
        lower_map = {k.lower(): v for k, v in self._synonyms_map.items()}
        for s in list(skill_names):
            key = s.lower()
            if key in lower_map:
                enriched.extend(lower_map[key])
        return list(set(enriched))

    @property
    def hybrid_matcher(self):
        if self._hybrid_matcher is None:
            try:
                import sys
                import os
                # Add ai_matching directory to path
                sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ai_matching')))
                from app.matching.hybrid_matcher import HybridMatcher
                self._hybrid_matcher = HybridMatcher()
            except Exception as e:
                print(f"Failed to initialize hybrid matcher: {e}")
                print("Falling back to basic skill-based matching")
        return self._hybrid_matcher

    def get_recommendations(self, db: Session, profile: StudentProfile) -> List[Dict[str, Any]]:
        student_id = profile.id
        current_time = time.time()
        
        # Check cache first
        if student_id in self._recommendations_cache:
            cached_time, cached_recs = self._recommendations_cache[student_id]
            if current_time - cached_time < self._CACHE_DURATION:
                print(f"Returning cached recommendations for student {student_id}")
                return cached_recs
            else:
                print(f"Cache expired for student {student_id}, regenerating recommendations")
        
        student_skills = self.get_student_skills(db, profile.id)
        student_skills_set = set(s.lower() for s in student_skills)
        
        internships = db.query(Internship).all()
        recommendations = []
        
        for internship in internships:
            # Fetch internship skills
            int_skills = db.query(Skill.name).join(InternshipSkill).filter(InternshipSkill.internship_id == internship.id).all()
            required_skills = set(s[0].lower() for s in int_skills)
            required_skills_list = [s[0] for s in int_skills]
            
            # Try hybrid matching if available
            if self.hybrid_matcher:
                try:
                    # Create student and internship objects for the hybrid matcher
                    student = {
                        "skills": student_skills,
                        "year": profile.current_year or 1,
                        "location": profile.current_city or "",
                    }
                    
                    internship_obj = {
                        "required_skills": required_skills_list,
                        "min_year": 1,  # Default min year
                        "is_remote": internship.mode == "remote",
                        "location": internship.location,
                    }
                    
                    # Get hybrid match score
                    match_result = self.hybrid_matcher.match(student, internship_obj)
                    
                    if match_result["status"] == "MATCHED":
                        matched_skills = student_skills_set.intersection(required_skills)
                        missing_skills = required_skills - matched_skills
                        
                        recommendations.append({
                            "internship_id": internship.id,
                            "title": internship.title,
                            "company_name": internship.employer.company_name if internship.employer else "Unknown",
                            "match_score": match_result["final_score"],
                            "matching_skills": list(matched_skills),
                            "missing_skills": list(missing_skills),
                            "explanation": match_result["explanation"],
                            "status": match_result["status"],
                            "reason": "Hybrid match",
                            "rule_based_score": match_result["explanation"]["rule_based_score"],
                            "embedding_score": match_result["explanation"]["embedding_score"],
                            "feedback_boost": 0.0,
                            "cross_encoder_score": 0.0
                        })
                    continue
                except Exception as e:
                    print(f"Error in hybrid matching: {e}")
                    print("Falling back to basic skill-based matching for this internship")
            
            # Basic skill-based matching as fallback
            matched_skills = student_skills_set.intersection(required_skills)
            missing_skills = required_skills - matched_skills
            
            match_score = 0
            if required_skills:
                match_score = (len(matched_skills) / len(required_skills)) * 100
            elif student_skills_set: # If no specific skills required, match by location or just give some score
                match_score = 50 # Default score
            
            # Boost by location/mode if they match
            # Use preferred_location if available, else current_city
            student_location = profile.preferred_location or profile.current_city
            if student_location and student_location.lower() in internship.location.lower():
                match_score += 10
            
            if profile.work_mode:
                raw_modes = [m.strip().lower() for m in profile.work_mode.split(",")]
                normalized_modes = set()
                for m in raw_modes:
                    if m in ("in-office", "office", "on-site", "onsite"):
                        normalized_modes.add("onsite")
                    elif m in ("work from home", "remote", "wfh"):
                        normalized_modes.add("remote")
                    elif m == "hybrid":
                        normalized_modes.add("hybrid")
                    else:
                        normalized_modes.add(m)
                if internship.mode.lower() in normalized_modes:
                    match_score += 10

            if match_score > 0:
                recommendations.append({
                    "internship_id": internship.id,
                    "title": internship.title,
                    "company_name": internship.employer.company_name if internship.employer else "Unknown",
                    "match_score": match_score,
                    "matching_skills": list(matched_skills),
                    "missing_skills": list(missing_skills),
                    "explanation": {
                        "matched": list(matched_skills),
                        "missing": list(missing_skills),
                        "score": match_score
                    },
                    "status": "MATCHED",
                    "reason": "Skill match",
                    "rule_based_score": match_score,
                    "embedding_score": 0.0,
                    "feedback_boost": 0.0,
                    "cross_encoder_score": 0.0
                })
        
        # Sort by score and return top 10
        recommendations.sort(key=lambda x: x["match_score"], reverse=True)
        recommendations = recommendations[:10]
        
        # Cache the result
        self._recommendations_cache[student_id] = (current_time, recommendations)
        
        return recommendations

    def record_feedback(self, db: Session, student_id: int, internship_id: int, action: str):
        # Placeholder for recording feedback
        # In a real system, this would save to a UserFeedback or Interaction table
        pass

ai_service = AIService()
