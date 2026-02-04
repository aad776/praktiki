from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from db.session import get_db
from models.user import User
from models.student_profile import StudentProfile, StudentResume
from schemas.students import (
    StudentProfileUpdate, StudentProfileOut, SkillCreate, SkillOut, 
    ApplicationCreate, ApplicationOut, RecommendedInternship, FeedbackAction,
    StudentResumeCreate, StudentResumeUpdate, StudentResumeOut
)
from utils.dependencies import get_current_user
from models.skill import Skill
from models.student_skills import StudentSkill
from typing import List
from models.application import Application
from services.ai_service import ai_service
from models.internship_skills import InternshipSkill
from models.employer_profile import EmployerProfile
from models.internship import Internship
from schemas.employer import InternshipOut
import shutil
import os
import uuid

from sqlalchemy import func, desc
router = APIRouter()

@router.get("/internships/metadata")
def get_internship_metadata(
    db: Session = Depends(get_db)
):
    """
    Get dynamic metadata for Internship Mega Menu
    - Top Locations (by job count)
    - Top Profiles (by title count)
    """
    # Top Locations
    top_locations_query = db.query(
        Internship.location, func.count(Internship.id).label('count')
    ).group_by(Internship.location).order_by(desc('count')).limit(10).all()
    
    top_locations = [loc[0] for loc in top_locations_query if loc[0]]

    # Top Profiles (Titles)
    top_profiles_query = db.query(
        Internship.title, func.count(Internship.id).label('count')
    ).group_by(Internship.title).order_by(desc('count')).limit(10).all()
    
    top_profiles = [prof[0] for prof in top_profiles_query if prof[0]]

    return {
        "top_locations": top_locations,
        "top_profiles": top_profiles
    }

@router.get("/me", response_model=StudentProfileOut)
def get_my_profile(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not a student account")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    profile.email = current_user.email
    if not profile.full_name:
        profile.full_name = current_user.full_name
    return profile

@router.post("/me", response_model=StudentProfileOut)
def create_my_profile(
        profile_data: StudentProfileUpdate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can create profile")

    # Check if profile already exists
    existing_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if existing_profile:
        raise HTTPException(status_code=400, detail="Profile already exists")

    # Create new profile
    new_profile = StudentProfile(
        user_id=current_user.id,
        **profile_data.dict(exclude_unset=True)
    )
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    return new_profile

# --- UPDATE PROFILE (Internshala Style + APAAR Check) ---
@router.put("/me", response_model=StudentProfileOut)
def update_my_profile(
        profile_data: StudentProfileUpdate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can update profile")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()

    # --- SECURITY CHECK --- Only check if profile exists, not if verified
    if not profile:
        raise HTTPException(
            status_code=404,
            detail="Student profile not found"
        )

    # Handle APAAR ID update separately - check for duplicates
    if profile_data.apaar_id:
        # Check if this APAAR ID is already used by another user
        existing_user = db.query(User).filter(
            User.apaar_id == profile_data.apaar_id,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="This APAAR ID is already registered to another user")
        
        # Update APAAR ID on User model as well
        current_user.apaar_id = profile_data.apaar_id
        current_user.is_apaar_verified = True  # Mock verification
        profile.is_apaar_verified = True       # Sync to profile
        db.add(current_user)

    # Update Internshala fields (university, cgpa, phone etc.)
    for var, value in profile_data.dict(exclude_unset=True).items():
        setattr(profile, var, value)

    db.commit()
    db.refresh(profile)
    return profile

@router.put("/me/resume", response_model=StudentResumeOut)
def update_my_resume(
        resume_data: StudentResumeUpdate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can update resume")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    resume = db.query(StudentResume).filter(StudentResume.student_id == profile.id).first()
    if not resume:
        resume = StudentResume(student_id=profile.id)
        db.add(resume)
    
    for var, value in resume_data.dict(exclude_unset=True).items():
        setattr(resume, var, value)

    db.commit()
    db.refresh(resume)
    return resume

@router.get("/me/resume", response_model=StudentResumeOut)
def get_my_resume(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access resume")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    resume = db.query(StudentResume).filter(StudentResume.student_id == profile.id).first()
    if not resume:
        # Create empty resume if not exists
        resume = StudentResume(student_id=profile.id)
        db.add(resume)
        db.commit()
        db.refresh(resume)
    
    return resume

@router.post("/me/resume/upload")
def upload_resume_file(
        file: UploadFile = File(...),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can upload resume")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Create uploads directory if not exists
    upload_dir = "uploads/resumes"
    os.makedirs(upload_dir, exist_ok=True)

    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{profile.id}_{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update resume record
    resume = db.query(StudentResume).filter(StudentResume.student_id == profile.id).first()
    if not resume:
        resume = StudentResume(student_id=profile.id)
        db.add(resume)
    
    resume.resume_file_path = file_path
    db.commit()
    
    return {"filename": file.filename, "file_path": file_path}

@router.post("/me/skills", response_model=SkillOut)
def add_skill(
        skill_in: SkillCreate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can add skills")

    # APAAR Check for skills too (Optional but recommended)
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile.is_apaar_verified:
         raise HTTPException(status_code=403, detail="Verify APAAR to add skills")

    skill = db.query(Skill).filter(Skill.name == skill_in.name.lower()).first()
    if not skill:
        skill = Skill(name=skill_in.name.lower())
        db.add(skill)
        db.commit()
        db.refresh(skill)

    existing_link = db.query(StudentSkill).filter(
        StudentSkill.student_id == profile.id,
        StudentSkill.skill_id == skill.id
    ).first()

    if existing_link:
        raise HTTPException(status_code=400, detail="Skill already added")

    new_student_skill = StudentSkill(student_id=profile.id, skill_id=skill.id)
    db.add(new_student_skill)
    db.commit()

    return skill

@router.get("/me/skills", response_model=List[SkillOut])
def get_my_skills(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    skills = db.query(Skill).join(StudentSkill).filter(StudentSkill.student_id == profile.id).all()
    return skills

# --- APPLY FOR INTERNSHIP (Must be Verified) ---
@router.post("/apply", response_model=ApplicationOut)
def apply_for_internship(
        app_in: ApplicationCreate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can apply")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()

    # --- CRITICAL VERIFICATION CHECK ---
    # --- CRITICAL VERIFICATION CHECK (Relaxed for valid APAAR ID) ---
    if not profile.apaar_id:
        raise HTTPException(
            status_code=403,
            detail="APAAR ID missing. Please update your profile with your 12-digit APAAR ID to apply."
        )
    
    # Auto-verify if they have an ID (Mock Verification Logic)
    if not profile.is_apaar_verified:
        profile.is_apaar_verified = True
        db.add(profile)
        db.commit()

    existing_app = db.query(Application).filter(
        Application.student_id == profile.id,
        Application.internship_id == app_in.internship_id
    ).first()

    if existing_app:
        raise HTTPException(status_code=400, detail="Already applied")

    new_app = Application(student_id=profile.id, internship_id=app_in.internship_id)
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    return new_app

@router.get("/my-applications")
def get_my_applications(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Get all applications for the current student with detailed internship information"""
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    
    # Get applications with internship details
    applications = db.query(Application).filter(Application.student_id == profile.id).all()
    
    result = []
    for app in applications:
        # Get internship details
        internship = db.query(Internship).filter(Internship.id == app.internship_id).first()
        if internship:
            # Get employer details for company name
            employer = db.query(EmployerProfile).filter(EmployerProfile.id == internship.employer_id).first()
            
            result.append({
                "id": app.id,
                "internship_id": app.internship_id,
                "status": app.status,
                "applied_at": app.applied_at,
                "internship": {
                    "id": internship.id,
                    "title": internship.title,
                    "description": internship.description,
                    "location": internship.location,
                    "mode": internship.mode,
                    "duration_weeks": internship.duration_weeks,
                    "company_name": employer.company_name if employer else "Unknown Company"
                }
            })
    
    return result

@router.get("/recommendations", response_model=List[RecommendedInternship])
def get_recommendations(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Students only")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Get recommendations regardless of skill count - the AI service will handle fallbacks
    recommendations = ai_service.get_recommendations(db, profile)
    return recommendations

@router.post("/feedback")
def record_feedback(
        feedback: FeedbackAction,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Students only")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    ai_service.record_feedback(db, profile.id, feedback.internship_id, feedback.action)
    return {"status": "success"}

@router.get("/internships", response_model=List[InternshipOut])
def list_all_internships(
        search: str = None,
        location: str = None,
        mode: str = None,
        db: Session = Depends(get_db)
):
    """List internships with optional search filters"""
    def normalize_mode_value(val: str) -> str:
        v = (val or "").strip().lower()
        if v in ("office", "in-office", "in_office", "onsite", "in office"):
            return "onsite"
        if v in ("wfh", "work from home", "work-from-home", "remote"):
            return "remote"
        if v == "hybrid":
            return "hybrid"
        return val or ""
    def mode_synonyms(val: str) -> list[str]:
        v = normalize_mode_value(val)
        if v == "onsite":
            return ["onsite", "office", "in-office", "in_office", "in office"]
        if v == "remote":
            return ["remote", "wfh", "work from home", "work-from-home"]
        if v == "hybrid":
            return ["hybrid"]
        return [val] if val else []

    query = db.query(Internship)
    
    if search:
        search_like = f"%{search}%"
        query = query.filter(
            Internship.title.ilike(search_like) |
            Internship.description.ilike(search_like)
        )
    
    if location:
        query = query.filter(Internship.location.ilike(f"%{location}%"))
    
    if mode:
        query = query.filter(Internship.mode.in_(mode_synonyms(mode)))
    
    results = query.all()
    # Normalize mode values in the response
    for item in results:
        item.mode = normalize_mode_value(item.mode)
    return results

@router.get("/internships/{internship_id}")
def get_internship_details(
        internship_id: int,
        db: Session = Depends(get_db)
):
    """Get detailed information about a specific internship"""
    # Get internship with employer details
    internship = db.query(Internship).filter(Internship.id == internship_id).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")

    # Get employer details
    employer = db.query(EmployerProfile).filter(EmployerProfile.id == internship.employer_id).first()
    
    return {
        "id": internship.id,
        "title": internship.title,
        "description": internship.description,
        "location": internship.location,
        "mode": ("onsite" if (internship.mode or "").lower() in ("office", "in-office", "in office", "in_office") else
                 "remote" if (internship.mode or "").lower() in ("wfh", "work from home", "work-from-home") else
                 internship.mode),
        "duration_weeks": internship.duration_weeks,
        "employer": {
            "company_name": employer.company_name if employer else "Unknown Company",
            "contact_number": employer.contact_number if employer else ""
        }
    }
