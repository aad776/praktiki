from sqlalchemy.orm import Session
from models.student_profile import StudentProfile
from models.student_skills import StudentSkill
from models.skill import Skill
from models.internship import Internship
from models.internship_skills import InternshipSkill
from typing import List, Dict, Any

class AIService:
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
            
        return list(set(skill_names))

    def get_recommendations(self, db: Session, profile: StudentProfile) -> List[Dict[str, Any]]:
        student_skills = self.get_student_skills(db, profile.id)
        student_skills_set = set(s.lower() for s in student_skills)
        
        internships = db.query(Internship).all()
        recommendations = []
        
        for internship in internships:
            # Fetch internship skills
            int_skills = db.query(Skill.name).join(InternshipSkill).filter(InternshipSkill.internship_id == internship.id).all()
            required_skills = set(s[0].lower() for s in int_skills)
            
            # Simple matching: Intersection
            matching = student_skills_set.intersection(required_skills)
            missing = required_skills - matching
            
            match_score = 0
            if required_skills:
                match_score = (len(matching) / len(required_skills)) * 100
            elif student_skills_set: # If no specific skills required, match by location or just give some score
                match_score = 50 # Default score
            
            # Boost by location/mode if they match
            # Use preferred_location if available, else current_city
            student_location = profile.preferred_location or profile.current_city
            if student_location and student_location.lower() in internship.location.lower():
                match_score += 10
            
            if profile.work_mode:
                modes = [m.strip().lower() for m in profile.work_mode.split(",")]
                if internship.mode.lower() in modes:
                    match_score += 10

            if match_score > 0:
                recommendations.append({
                    "internship_id": internship.id,
                    "title": internship.title,
                    "company_name": internship.employer.company_name if internship.employer else "Unknown",
                    "match_score": match_score,
                    "matching_skills": list(matching),
                    "missing_skills": list(missing),
                    "explanation": {
                        "matched": list(matching),
                        "missing": list(missing),
                        "score": match_score
                    },
                    "status": "MATCHED",
                    "reason": "Skill match",
                    "rule_based_score": match_score,
                    "embedding_score": 0.0,
                    "feedback_boost": 0.0,
                    "cross_encoder_score": 0.0
                })
        
        # Sort by score
        recommendations.sort(key=lambda x: x["match_score"], reverse=True)
        return recommendations

    def record_feedback(self, db: Session, student_id: int, internship_id: int, action: str):
        # Placeholder for recording feedback
        # In a real system, this would save to a UserFeedback or Interaction table
        pass

ai_service = AIService()
