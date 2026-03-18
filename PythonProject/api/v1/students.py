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
import requests
from utils.settings import settings

from sqlalchemy import func, desc
from models.notification import Notification
from datetime import datetime
router = APIRouter()

@router.get("/internships", response_model=List[InternshipOut])
def list_internships(
    search: Optional[str] = None,
    location: Optional[str] = None,
    mode: Optional[str] = None,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """List all active internships with optional filters."""
    query = db.query(Internship).filter(Internship.status == "active")
    
    if search:
        query = query.filter(Internship.title.ilike(f"%{search}%"))
    if location:
        query = query.filter(Internship.location.ilike(f"%{location}%"))
    if mode and mode != "All Modes":
        query = query.filter(Internship.mode == mode.lower())
        
    internships = query.options(joinedload(Internship.employer)).limit(limit).all()
    
    # Manually populate company_name and logo_url for InternshipOut schema
    results = []
    for i in internships:
        item = InternshipOut.from_orm(i)
        if i.employer:
            item.company_name = i.employer.company_name
            item.logo_url = i.employer.logo_url
        results.append(item)
        
    return results

@router.get("/internships/{internship_id}", response_model=InternshipOut)
def get_internship(
    internship_id: int,
    db: Session = Depends(get_db)
):
    """Get details of a specific internship."""
    internship = db.query(Internship).filter(Internship.id == internship_id).options(
        joinedload(Internship.employer)
    ).first()
    
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
        
    result = InternshipOut.from_orm(internship)
    if internship.employer:
        result.company_name = internship.employer.company_name
        result.logo_url = internship.employer.logo_url
        
    return result

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
        institute = db.query(InstituteProfile).filter(
            InstituteProfile.institute_name.ilike(f"%{profile.university_name}%")
        ).first()
        if institute:
            profile.institute_id = institute.id

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
    """
    Workflow for Certificate Verification:
    1. Upload to Main Backend (here).
    2. Forward to Certificate Verification Service (Port 8003).
    3. Verification Service performs OCR/QR/AI Extraction.
    4. Main Backend receives extracted data and notifies Institute.
    """
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can upload certificates")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Save file locally first
    upload_dir = "secure_uploads/certificates"
    os.makedirs(upload_dir, exist_ok=True)
    file_extension = os.path.splitext(file.filename)[1]
    file_name = f"{current_user.id}_{uuid.uuid4().hex}{file_extension}"
    file_path = os.path.join(upload_dir, file_name)

    # Re-seek to start because we might need to send it again
    file.file.seek(0)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Forward to Verification Service (Port 8003)
    try:
        # We need to send the file to the other service
        file.file.seek(0)
        files = {"file": (file.filename, file.file, file.content_type)}
        # Forwarding student_id if needed by the other service
        response = requests.post(
            settings.CERT_VERIFICATION_URL, 
            files=files,
            headers={"Authorization": f"Bearer {current_user.id}"} # Placeholder auth if required
        )
        
        if response.status_code == 200:
            extracted_data = response.json()
            # Update profile or store verification result
            profile.certificate_url = file_path
            
            # Notify Institute if student is mapped
            if profile.institute_id:
                institute = db.query(InstituteProfile).filter(InstituteProfile.id == profile.institute_id).first()
                if institute:
                    notif = Notification(
                        user_id=institute.user_id,
                        message=f"New internship certificate uploaded by {profile.first_name} {profile.last_name} ({profile.apaar_id}). Verification pending institute approval."
                    )
                    db.add(notif)
            
            db.commit()
            return {
                "message": "Certificate uploaded and verified successfully", 
                "file_path": file_path,
                "verification_data": extracted_data
            }
        else:
            # Fallback if verification service fails but file is saved
            profile.certificate_url = file_path
            db.commit()
            return {
                "message": "Certificate uploaded, but automated verification failed. Manual review required.",
                "file_path": file_path,
                "error": response.text
            }
            
    except Exception as e:
        print(f"Error forwarding to verification service: {e}")
        profile.certificate_url = file_path
        db.commit()
        return {
            "message": "Certificate uploaded locally. Automated verification service is currently unavailable.",
            "file_path": file_path
        }

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

@router.get("/recommendations", response_model=List[RecommendedInternship])
def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can get recommendations")
        
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    return ai_service.get_recommendations(db, profile)

@router.post("/apply", response_model=ApplicationOut)
def apply_to_internship(
    application_in: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can apply")
        
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    # Check if internship exists
    internship = db.query(Internship).filter(Internship.id == application_in.internship_id).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
        
    # Check if already applied
    existing_app = db.query(Application).filter(
        Application.student_id == profile.id,
        Application.internship_id == application_in.internship_id
    ).first()
    if existing_app:
        raise HTTPException(status_code=400, detail="Already applied to this internship")
        
    new_app = Application(
        student_id=profile.id,
        internship_id=application_in.internship_id,
        status="pending"
    )
    db.add(new_app)
    
    # Notification for employer
    notif = Notification(
        user_id=internship.employer.user_id,
        message=f"New application received for '{internship.title}' from {profile.full_name or current_user.full_name}."
    )
    db.add(notif)
    
    db.commit()
    db.refresh(new_app)
    return new_app

@router.post("/feedback")
def record_feedback(
    feedback: FeedbackAction,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # This would typically be sent to the AI Matching service
    # For now, we'll just acknowledge it
    print(f"Feedback received from user {current_user.id}: {feedback.action} on internship {feedback.internship_id}")
    return {"status": "success"}

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
