from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from db.session import get_db
from models.user import User
from models.student_profile import StudentProfile, StudentResume, StudentResumeHistory
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
from models.notification import Notification
from datetime import datetime
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
    # Set full_name for the response schema
    profile.full_name = current_user.full_name
    
    # Map fields from current_user to profile object for Pydantic schema
    profile.apaar_id = current_user.apaar_id
    profile.is_apaar_verified = bool(current_user.is_apaar_verified)
    profile.phone_number = current_user.phone_number
    
    # Ensure mandatory boolean fields are not None
    if profile.is_apaar_verified is None:
        profile.is_apaar_verified = False
        
    print(f"Returning profile for user {current_user.id}: {profile.full_name}, verified: {profile.is_apaar_verified}")
    
    # Fix broken placeholder profile picture URL
    if hasattr(profile, 'resume') and profile.resume and profile.resume.profile_picture:
        if "via.placeholder.com" in profile.resume.profile_picture:
            profile.resume.profile_picture = f"https://api.dicebear.com/7.x/avataaars/svg?seed={current_user.full_name or 'student'}"
    
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

    # Automatically link to institute if university_name matches a registered institute
    if new_profile.university_name:
        from models.institute_profile import InstituteProfile
        # Use case-insensitive matching with ilike
        institute = db.query(InstituteProfile).filter(
            InstituteProfile.institute_name.ilike(f"%{new_profile.university_name}%")
        ).first()
        if institute:
            new_profile.institute_id = institute.id

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

    # Automatically link to institute if university_name matches a registered institute
    if profile.university_name:
        from models.institute_profile import InstituteProfile
        # Use case-insensitive matching with ilike
        institute = db.query(InstituteProfile).filter(
            InstituteProfile.institute_name.ilike(f"%{profile.university_name}%")
        ).first()
        if institute:
            profile.institute_id = institute.id

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
    
    # Fix broken placeholder profile picture URL
    if resume.profile_picture and "via.placeholder.com" in resume.profile_picture:
        resume.profile_picture = f"https://api.dicebear.com/7.x/avataaars/svg?seed={current_user.full_name or 'student'}"
        
    return resume

@router.post("/me/resume/upload")
def upload_resume_file(
        file: UploadFile = File(...),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can upload resume")

    # 1. Validate file extension
    allowed_extensions = {".pdf", ".doc", ".docx"}
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file format. Allowed formats: {', '.join(allowed_extensions)}"
        )

    # 2. Validate file size (5MB limit)
    MAX_FILE_SIZE = 5 * 1024 * 1024 # 5MB in bytes
    file_size = 0
    
    # Read file to get size and then reset pointer
    file.file.seek(0, os.SEEK_END)
    file_size = file.file.tell()
    file.file.seek(0)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400, 
            detail="File too large. Maximum size allowed is 5MB."
        )

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Create uploads directory if not exists
    upload_dir = "secure_uploads/resumes"
    os.makedirs(upload_dir, exist_ok=True)

    # Handle replacement of old file
    resume = db.query(StudentResume).filter(StudentResume.student_id == profile.id).first()
    if resume and resume.resume_file_path:
        old_file_path = resume.resume_file_path
        if os.path.exists(old_file_path):
            try:
                os.remove(old_file_path)
            except Exception as e:
                print(f"Error removing old resume file: {e}")

    # Generate unique filename
    unique_filename = f"{profile.id}_{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update resume record
    if not resume:
        resume = StudentResume(student_id=profile.id)
        db.add(resume)
    
    # Save to history before updating the main record (optional, but good for tracking)
    # Actually, we'll save the new one to history now
    history_entry = StudentResumeHistory(
        resume=resume,
        file_path=file_path,
        filename=file.filename,
        file_size=file_size
    )
    db.add(history_entry)

    resume.resume_file_path = file_path
    resume.resume_filename = file.filename
    resume.resume_file_size = file_size
    # resume_uploaded_at will be updated by server_default/onupdate
    
    db.commit()
    
    return {
        "filename": file.filename, 
        "file_path": file_path,
        "size": file_size,
        "uploaded_at": datetime.utcnow()
    }

from fastapi.responses import FileResponse

@router.get("/resume/download/{filename}")
def download_resume(
    filename: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Securely download a resume.
    Access allowed for:
    1. The student themselves
    2. Employers who have received an application from this student
    """
    # Find the resume by filename (checking both current and history)
    # For simplicity, we'll check the current path first, then history
    resume = db.query(StudentResume).filter(
        (StudentResume.resume_file_path.like(f"%{filename}"))
    ).first()
    
    history = None
    if not resume:
        # Check history
        history = db.query(StudentResumeHistory).filter(
            (StudentResumeHistory.file_path.like(f"%{filename}"))
        ).first()
        if history:
            resume = history.resume
        else:
            raise HTTPException(status_code=404, detail="Resume not found")

    student_profile = resume.student
    
    # Permission Check
    allowed = False
    
    # 1. Is it the student?
    if current_user.id == student_profile.user_id:
        allowed = True
    
    # 2. Is it an employer who received an application?
    if not allowed and current_user.role == "employer":
        application = db.query(Application).filter(
            Application.student_id == student_profile.id,
            Application.internship_id.in_(
                db.query(Internship.id).filter(Internship.employer_id == current_user.id)
            )
        ).first()
        if application:
            allowed = True

    if not allowed:
        raise HTTPException(status_code=403, detail="You do not have permission to access this resume")

    # Get the actual file path
    file_path = resume.resume_file_path if not history else history.file_path
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server")

    return FileResponse(
        path=file_path,
        filename=resume.resume_filename if not history else history.filename,
        media_type="application/octet-stream"
    )

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
    if not current_user.apaar_id:
        raise HTTPException(
            status_code=403,
            detail="APAAR ID missing. Please update your profile with your 12-digit APAAR ID to apply."
        )
    
    # Auto-verify if they have an ID (Mock Verification Logic)
    if not current_user.is_apaar_verified:
        current_user.is_apaar_verified = True
        db.add(current_user)
        db.commit()

    existing_app = db.query(Application).filter(
        Application.student_id == profile.id,
        Application.internship_id == app_in.internship_id
    ).first()

    if existing_app:
        raise HTTPException(status_code=400, detail="Already applied")

    new_app = Application(student_id=profile.id, internship_id=app_in.internship_id)
    db.add(new_app)
    
    # Add notification for employer
    internship = db.query(Internship).filter(Internship.id == app_in.internship_id).first()
    if internship:
        employer = db.query(EmployerProfile).filter(EmployerProfile.id == internship.employer_id).first()
        if employer:
            notif = Notification(
                user_id=employer.user_id,
                message=f"New application received for your internship: '{internship.title}' from {current_user.full_name}."
            )
            db.add(notif)

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

    query = db.query(
        Internship.id,
        Internship.employer_id,
        Internship.title,
        Internship.description,
        Internship.location,
        Internship.mode,
        Internship.duration_weeks,
        Internship.deadline,
        Internship.skills,
        Internship.created_at,
        EmployerProfile.company_name,
        EmployerProfile.logo_url
    ).join(EmployerProfile, Internship.employer_id == EmployerProfile.id)
    
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
    
    # Map results to InternshipOut format
    output = []
    for item in results:
        output.append({
            "id": item.id,
            "employer_id": item.employer_id,
            "title": item.title,
            "description": item.description,
            "location": item.location,
            "mode": normalize_mode_value(item.mode),
            "duration_weeks": item.duration_weeks,
            "deadline": item.deadline,
            "skills": item.skills,
            "created_at": item.created_at,
            "company_name": item.company_name,
            "logo_url": item.logo_url
        })
    
    return output

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
    
    # Get applicant count
    applicant_count = db.query(func.count(Application.id)).filter(Application.internship_id == internship_id).scalar()
    
    # Get employer's company user info (for logo/email if needed)
    employer_user = db.query(User).filter(User.id == employer.user_id).first() if employer else None

    # Calculate posted date (using created_at if available, fallback to None)
    # Note: Internship model doesn't seem to have created_at in the snippet, checking Application for inspiration
    # We'll return fields even if null
    
    return {
        "id": internship.id,
        "title": internship.title,
        "description": internship.description,
        "location": internship.location,
        "mode": ("onsite" if (internship.mode or "").lower() in ("office", "in-office", "in office", "in_office") else
                 "remote" if (internship.mode or "").lower() in ("wfh", "work from home", "work-from-home") else
                 internship.mode),
        "duration_weeks": internship.duration_weeks,
        "stipend_amount": internship.stipend_amount,
        "deadline": internship.deadline,
        "start_date": internship.start_date,
        "skills": internship.skills,
        "openings": internship.openings,
        "qualifications": internship.qualifications,
        "benefits": internship.benefits,
        "applicant_count": applicant_count,
        "employer": {
            "id": employer.id if employer else None,
            "company_name": employer.company_name if employer else "Unknown Company",
            "contact_number": employer.contact_number if employer else "",
            "industry": employer.industry if employer else "",
            "organization_description": employer.organization_description if employer else "",
            "website_url": employer.website_url if employer else "",
            "logo_url": employer.logo_url if employer else "",
            "city": employer.city if employer else ""
        }
    }
