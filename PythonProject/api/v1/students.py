from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
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
from typing import List, Optional
from models.application import Application
from services.ai_service import ai_service
from models.internship_skills import InternshipSkill
from models.employer_profile import EmployerProfile
from models.internship import Internship
from schemas.employer import InternshipOut
import shutil
import os
import uuid
import json

from sqlalchemy import func, desc
from models.notification import Notification
from datetime import datetime
import sys
import os

# Add resume_parser to sys path for internal imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

# Global instances for extractors
pdf_processor = None
entity_extractor = None
experience_extractor = None
skills_extractor = None
PARSER_AVAILABLE = False

def init_resume_parser():
    global pdf_processor, entity_extractor, experience_extractor, skills_extractor, PARSER_AVAILABLE
    try:
        from resume_parser.pdf_processor import PDFProcessor
        from resume_parser.entity_extractor import EntityExtractor
        from resume_parser.experience_extractor import ExperienceExtractor
        from resume_parser.skills_extractor import SkillsExtractor
        from resume_parser.config import SPACY_MODEL
        
        print(f"DEBUG: Initializing resume parser with {SPACY_MODEL}...")
        pdf_processor = PDFProcessor()
        entity_extractor = EntityExtractor(SPACY_MODEL)
        experience_extractor = ExperienceExtractor()
        skills_extractor = SkillsExtractor()
        PARSER_AVAILABLE = True
        print("DEBUG: Resume parser initialized successfully!")
    except Exception as e:
        print(f"DEBUG: Resume parser initialization failed: {e}")
        import traceback
        traceback.print_exc()
        PARSER_AVAILABLE = False

# Initialize on module load
init_resume_parser()

router = APIRouter()

@router.post("/me/parse-resume")
async def parse_my_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Parse a resume PDF and return structured data for profile completion"""
    if not PARSER_AVAILABLE:
        raise HTTPException(status_code=503, detail="Resume parser service is not initialized")
    
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can parse resumes")

    # Validate file type
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF resumes are supported for parsing")

    try:
        file_content = await file.read()
        
        # Step 1: Extract text from PDF
        text = pdf_processor.extract_text_from_bytes(file_content)
        if not text:
            raise HTTPException(status_code=400, detail="Failed to extract text from PDF")
            
        # Step 2: Extract entities
        name, email, phone = entity_extractor.extract_all_entities(text)
        
        # Step 3: Extract skills
        skills = skills_extractor.extract_skills(text, use_semantic=True)
        
        # Step 4: Extract experience
        experience = experience_extractor.extract_experiences(text)
        
        # Format names (split if needed)
        first_name = ""
        last_name = ""
        if name:
            parts = name.split()
            first_name = parts[0] if parts else ""
            last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
        
        return {
            "success": True,
            "data": {
                "first_name": first_name or current_user.full_name.split()[0] if current_user.full_name else "",
                "last_name": last_name or " ".join(current_user.full_name.split()[1:]) if current_user.full_name and len(current_user.full_name.split()) > 1 else "",
                "email": email or current_user.email,
                "phone_number": phone or current_user.phone_number,
                "skills": skills,
                "experience": [
                    {
                        "company": exp.company,
                        "position": exp.position,
                        "duration": exp.duration,
                        "description": exp.description
                    } for exp in experience
                ],
                "raw_text_preview": text[:500]
            }
        }
    except Exception as e:
        print(f"Error parsing resume: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")


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

@router.get("/internships", response_model=List[InternshipOut])
def list_internships(
    search: Optional[str] = None,
    location: Optional[str] = None,
    mode: Optional[str] = None,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """List all available internships with filters"""
    query = db.query(Internship).join(EmployerProfile)
    
    if search:
        query = query.filter(Internship.title.ilike(f"%{search}%"))
    if location:
        query = query.filter(Internship.location.ilike(f"%{location}%"))
    if mode:
        query = query.filter(Internship.mode == mode)
        
    internships = query.limit(limit).all()
    
    # Map company_name and logo_url from employer
    results = []
    for i in internships:
        # Pydantic will handle the mapping if we provide the right object structure
        # but since we want to add company_name from the joined table, we can do it manually or via property
        i.company_name = i.employer.company_name if i.employer else "Unknown Company"
        i.logo_url = i.employer.logo_url if i.employer else None
        results.append(i)
        
    return results

@router.get("/internships/{internship_id}", response_model=InternshipOut)
def get_internship_details(
    internship_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information for a specific internship"""
    internship = db.query(Internship).filter(Internship.id == internship_id).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
        
    internship.company_name = internship.employer.company_name if internship.employer else "Unknown Company"
    internship.logo_url = internship.employer.logo_url if internship.employer else None
    
    return internship

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
def update_or_create_my_profile(
        profile_data: StudentProfileUpdate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Upsert profile: Create if not exists, otherwise update."""
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can manage profile")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()

    if not profile:
        # Create new profile
        profile = StudentProfile(user_id=current_user.id)
        db.add(profile)
    
    # Handle APAAR ID update separately - check for duplicates
    if profile_data.apaar_id:
        existing_user = db.query(User).filter(
            User.apaar_id == profile_data.apaar_id,
            User.id != current_user.id
        ).first()
        if existing_user:
            raise HTTPException(status_code=400, detail="This APAAR ID is already registered to another user")
        
        current_user.apaar_id = profile_data.apaar_id
        current_user.is_apaar_verified = True
        profile.is_apaar_verified = True
        db.add(current_user)

    # Update fields
    for var, value in profile_data.dict(exclude_unset=True).items():
        setattr(profile, var, value)

    # Automatically link to institute
    if profile.university_name:
        from models.institute_profile import InstituteProfile
        from models.college import College
        
        # 1. Try exact AISHE code match via the verified colleges table
        # Since university_name is picked from the Autocomplete (which uses College table)
        college = db.query(College).filter(
            College.name == profile.university_name
        ).first()
        
        if college and college.aishe_code:
            # Find institute that has the same AISHE code (most reliable)
            institute = db.query(InstituteProfile).filter(
                InstituteProfile.aishe_code == college.aishe_code.strip().upper()
            ).first()
            if institute:
                profile.institute_id = institute.id
                print(f"DEBUG: Linked student {current_user.id} to institute {institute.id} via AISHE {college.aishe_code}")
        
        # 2. Fallback to direct name match if not linked yet
        if not profile.institute_id:
            institute = db.query(InstituteProfile).filter(
                InstituteProfile.institute_name.ilike(f"%{profile.university_name}%")
            ).first()
            if institute:
                profile.institute_id = institute.id
                print(f"DEBUG: Linked student {current_user.id} to institute {institute.id} via Name Match")

    db.commit()
    db.refresh(profile)
    return profile

# Keep PUT for backward compatibility but point to the same logic
@router.put("/me", response_model=StudentProfileOut)
def update_my_profile_put(
        profile_data: StudentProfileUpdate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    return update_or_create_my_profile(profile_data, current_user, db)

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

@router.post("/me/certificate")
def upload_certificate(
        file: UploadFile = File(...),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can upload certificates")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Securely save the file
    upload_dir = "secure_uploads/certificates"
    os.makedirs(upload_dir, exist_ok=True)
    file_extension = os.path.splitext(file.filename)[1]
    file_name = f"{current_user.id}_{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(upload_dir, file_name)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # For now, let's just store the path in the student's profile
    # In a real app, we'd have a separate table for certificates
    profile.certificate_url = file_path
    db.commit()

    return {"message": "Certificate uploaded successfully", "file_path": file_path}

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

@router.get("/my-applications", response_model=List[ApplicationOut])
def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not a student")
        
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        return []
        
    applications = db.query(Application).filter(Application.student_id == profile.id)\
        .options(
            joinedload(Application.internship).joinedload(Internship.employer),
            joinedload(Application.credit_request)
        ).all()
    
    results = []
    for app in applications:
        # Construct InternshipOut
        internship_data = None
        if app.internship:
            employer = app.internship.employer
            internship_data = InternshipOut(
                id=app.internship.id,
                employer_id=app.internship.employer_id,
                title=app.internship.title,
                description=app.internship.description,
                location=app.internship.location,
                mode=app.internship.mode,
                duration_weeks=app.internship.duration_weeks,
                deadline=app.internship.deadline,
                skills=app.internship.skills,
                policy=app.internship.policy,
                created_at=app.internship.created_at,
                company_name=employer.company_name if employer else "Unknown Company",
                logo_url=employer.logo_url if employer else None
            )
            
        results.append(app)
    
    return results
