from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from db.session import get_db
from models.user import User
from models.employer_profile import EmployerProfile
from models.internship import Internship
from schemas.employer import (
    InternshipCreate, InternshipOut, EmployerProfileUpdate, EmployerProfileOut,
    ApplicationStatusUpdate, ApplicationComplete, BulkApplicationStatusUpdate, DashboardMetrics, ApplicationOut,
    ApplicationWithStudentOut
)
from utils.dependencies import get_current_user, require_verified_employer
from typing import List, Optional
from models.application import Application
from models.student_profile import StudentProfile, StudentResume
from models.notification import Notification
from models.credit import CreditRequest
from utils.email import send_application_accepted_email
from sqlalchemy import func
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

@router.get("/dashboard/metrics", response_model=DashboardMetrics)
def get_dashboard_metrics(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")
    
    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    if not employer:
        # Auto-create profile if missing for existing user (migration/fallback)
        employer = EmployerProfile(user_id=current_user.id)
        db.add(employer)
        db.commit()
        db.refresh(employer)

    # Get all internships for this employer
    internship_ids = [i.id for i in db.query(Internship.id).filter(Internship.employer_id == employer.id).all()]
    
    if not internship_ids:
        return DashboardMetrics(
            total_applicants=0,
            completed_internships=0,
            accepted_applications=0,
            rejected_applications=0,
            ongoing_programs=0
        )

    total_applicants = db.query(Application).filter(Application.internship_id.in_(internship_ids)).count()
    accepted_apps = db.query(Application).filter(
        Application.internship_id.in_(internship_ids),
        Application.status == "accepted"
    ).count()
    rejected_apps = db.query(Application).filter(
        Application.internship_id.in_(internship_ids),
        Application.status == "rejected"
    ).count()
    
    completed_internships = db.query(Internship).filter(
        Internship.employer_id == employer.id,
        Internship.status == "completed"
    ).count()
    
    ongoing_programs = db.query(Internship).filter(
        Internship.employer_id == employer.id,
        Internship.status == "active"
    ).count()

    return DashboardMetrics(
        total_applicants=total_applicants,
        completed_internships=completed_internships,
        accepted_applications=accepted_apps,
        rejected_applications=rejected_apps,
        ongoing_programs=ongoing_programs
    )

@router.get("/applications/all", response_model=List[ApplicationOut])
def get_all_applications(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")
    
    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    if not employer:
        # Return empty list if profile doesn't exist (although auto-creation in other endpoints should handle this)
        return []

    # Join with Internship and StudentProfile to get titles and names
    results = db.query(
        Application, 
        Internship.title, 
        User.full_name,
        StudentProfile.first_name,
        StudentProfile.last_name,
        StudentProfile.university_name,
        StudentProfile.degree,
        StudentProfile.skills,
        StudentResume.resume_file_path
    ).join(
        Internship, Application.internship_id == Internship.id
    ).join(
        StudentProfile, Application.student_id == StudentProfile.id
    ).join(
        User, StudentProfile.user_id == User.id
    ).outerjoin(
        StudentResume, StudentProfile.id == StudentResume.student_id
    ).filter(Internship.employer_id == employer.id).all()

    output = []
    for app, title, full_name, first_name, last_name, univ, degree, skills, resume_path in results:
        # Construct student name
        name = full_name
        if not name:
            if first_name and last_name:
                name = f"{first_name} {last_name}"
            elif first_name:
                name = first_name
            elif last_name:
                name = last_name
            else:
                name = "Unknown Student"

        # Handle applied_at safely
        applied_at_str = ""
        if app.applied_at:
            if isinstance(app.applied_at, datetime):
                applied_at_str = app.applied_at.isoformat()
            else:
                applied_at_str = str(app.applied_at)

        output.append(ApplicationOut(
            id=app.id,
            student_id=app.student_id,
            internship_id=app.internship_id,
            status=app.status,
            applied_at=applied_at_str,
            student_name=name,
            internship_title=title,
            university_name=univ,
            course=degree,
            skills=skills,
            resume_url=resume_path
        ))
    return output

@router.post("/applications/bulk-status")
def bulk_update_application_status(
        req: BulkApplicationStatusUpdate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")
    
    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    
    # Verify all applications belong to this employer
    apps = db.query(Application).join(Internship).filter(
        Application.id.in_(req.application_ids),
        Internship.employer_id == employer.id
    ).all()
    
    if len(apps) != len(req.application_ids):
        raise HTTPException(status_code=400, detail="Some applications not found or unauthorized")

    for app in apps:
        old_status = app.status
        app.status = req.status
        
        # Add notification
        notif_msg = f"Your application for '{app.internship.title}' has been {req.status}." if app.internship else f"Your application status has been updated to {req.status}."
        notif = Notification(
            user_id=app.student.user_id,
            message=notif_msg
        )
        db.add(notif)

        # Send email if status changed to accepted
        if req.status == "accepted" and old_status != "accepted":
            try:
                # Need student email and name
                student = app.student
                user = student.user
                company_name = employer.company_name or "the employer"
                
                send_application_accepted_email(
                    student_email=user.email,
                    student_name=student.first_name or user.full_name or "Student",
                    internship_title=app.internship.title,
                    company_name=company_name
                )
            except Exception as e:
                print(f"Failed to send acceptance email: {e}")
    
    db.commit()
    return {"message": f"Successfully updated {len(apps)} applications to {req.status}"}

@router.patch("/applications/{application_id}/status")
def update_application_status(
        application_id: int,
        status_update: ApplicationStatusUpdate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")
    
    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    
    app = db.query(Application).join(Internship).filter(
        Application.id == application_id,
        Internship.employer_id == employer.id
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    old_status = app.status
    app.status = status_update.status
    
    # Add notification
    notif_msg = f"Your application for '{app.internship.title}' has been {status_update.status}." if app.internship else f"Your application status has been updated to {status_update.status}."
    notif = Notification(
        user_id=app.student.user_id,
        message=notif_msg
    )
    db.add(notif)

    # Send email if status changed to accepted
    if status_update.status == "accepted" and old_status != "accepted":
        try:
            student = app.student
            user = student.user
            company_name = employer.company_name or "the employer"
            
            send_application_accepted_email(
                student_email=user.email,
                student_name=student.first_name or user.full_name or "Student",
                internship_title=app.internship.title,
                company_name=company_name
            )
        except Exception as e:
            print(f"Failed to send acceptance email: {e}")
    
    db.commit()
    return {"message": f"Application status updated to {status_update.status}"}

@router.get("/applications/accepted", response_model=List[ApplicationOut])
def get_accepted_applications(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")
    
    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    if not employer:
        return []

    # Filter by status 'accepted'
    results = db.query(
        Application, 
        Internship.title, 
        User.full_name,
        StudentProfile.first_name,
        StudentProfile.last_name,
        StudentProfile.university_name,
        StudentProfile.degree,
        StudentProfile.skills,
        StudentResume.resume_file_path
    ).join(
        Internship, Application.internship_id == Internship.id
    ).join(
        StudentProfile, Application.student_id == StudentProfile.id
    ).join(
        User, StudentProfile.user_id == User.id
  ).outerjoin(
        StudentResume, StudentProfile.id == StudentResume.student_id
    ).filter(
        Internship.employer_id == employer.id,
        Application.status == "accepted"
    ).all()

    output = []
    for app, title, full_name, first_name, last_name, univ, degree, skills, resume_path in results:
        name = full_name
        if not name:
            if first_name and last_name:
                name = f"{first_name} {last_name}"
            elif first_name:
                name = first_name
            elif last_name:
                name = last_name
            else:
                name = "Unknown Student"

        applied_at_str = ""
        if app.applied_at:
            if isinstance(app.applied_at, datetime):
                applied_at_str = app.applied_at.isoformat()
            else:
                applied_at_str = str(app.applied_at)

        output.append(ApplicationOut(
            id=app.id,
            student_id=app.student_id,
            internship_id=app.internship_id,
            status=app.status,
            applied_at=applied_at_str,
            student_name=name,
            internship_title=title,
            university_name=univ,
            course=degree,
            skills=skills,
            resume_url=resume_path
        ))
    return output

@router.put("/applications/{application_id}/complete")
def complete_internship(
        application_id: int,
        data: ApplicationComplete,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")
    
    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    
    app = db.query(Application).join(Internship).filter(
        Application.id == application_id,
        Internship.employer_id == employer.id
    ).first()
    
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
        
    app.status = "completed"
    app.hours_worked = data.hours_worked
    app.policy_used = data.policy_type
    
    # Calculate Credits
    credits = 0.0
    if data.policy_type == "UGC":
        credits = data.hours_worked / 30.0
    elif data.policy_type == "AICTE":
        credits = data.hours_worked / 40.0
    
    app.credits_awarded = round(credits, 2)
    
    # Create Credit Request for Institute
    credit_request = CreditRequest(
        student_id=app.student_id,
        application_id=app.id,
        hours=data.hours_worked,
        credits_calculated=app.credits_awarded,
        policy_type=data.policy_type,
        status="pending"
    )
    db.add(credit_request)
    
    # Notification for student
    notif = Notification(
        user_id=app.student.user_id,
        message=f"Your internship '{app.internship.title}' has been marked as completed. {data.hours_worked} hours recorded. Pending Institute approval."
    )
    db.add(notif)
    
    db.commit()
    return {"message": "Internship marked as completed and sent for credit approval"}

@router.get("/profile")
def get_employer_profile(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """
    Get employer profile with consolidated verification status.
    Returns profile data + user verification flags + computed is_profile_complete.
    """
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")
    
    profile = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    if not profile:
        # Auto-create if missing
        profile = EmployerProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    
    # Check if profile is complete (all required fields filled)
    required_fields = [
        profile.company_name,
        profile.contact_number,
        profile.designation,
        profile.city,
        profile.industry
    ]
    is_profile_complete = all(f and str(f).strip() != "" for f in required_fields)
    
    # Determine overall verification status
    # For development: only require profile complete
    # For production: uncomment to also require email + phone verified
    is_fully_verified = is_profile_complete
    # Production check:
    # is_fully_verified = (
    #     is_profile_complete and 
    #     bool(current_user.is_email_verified) and 
    #     bool(current_user.is_phone_verified)
    # )
    
    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "company_name": profile.company_name or "",
        "contact_number": profile.contact_number or "",
        "designation": profile.designation or "",
        "organization_description": profile.organization_description or "",
        "city": profile.city or "",
        "industry": profile.industry or "",
        "employee_count": profile.employee_count or "",
        "logo_url": profile.logo_url or "",
        "website_url": profile.website_url or "",
        "license_document_url": profile.license_document_url or "",
        "social_media_link": profile.social_media_link or "",
        "is_verified": profile.is_verified or False,
        # Include user verification status
        "is_email_verified": current_user.is_email_verified or False,
        "is_phone_verified": current_user.is_phone_verified or False,
        # Computed flags for frontend convenience
        "is_profile_complete": is_profile_complete,
        "is_fully_verified": is_fully_verified,
        # User's full name and email for display
        "full_name": current_user.full_name or "",
        "email": current_user.email or ""
    }

@router.put("/profile", response_model=EmployerProfileOut)
def update_employer_profile(
        profile_in: EmployerProfileUpdate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")
    profile = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    if not profile:
        profile = EmployerProfile(user_id=current_user.id)
        db.add(profile)
    for var, value in profile_in.dict(exclude_unset=True).items():
        setattr(profile, var, value)
    db.commit()
    db.refresh(profile)
    return profile

@router.post("/internships", response_model=InternshipOut)
def create_internship(
        internship_in: InternshipCreate,
        current_user: User = Depends(require_verified_employer),
        db: Session = Depends(get_db)
):
    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()

    new_internship = Internship(
        employer_id=employer.id,
        title=internship_in.title,
        description=internship_in.description,
        location=internship_in.location,
        mode=internship_in.mode,
        duration_weeks=internship_in.duration_weeks,
        stipend_amount=internship_in.stipend_amount,
        deadline=internship_in.deadline,
        start_date=internship_in.start_date,
        skills=",".join(internship_in.skills) if internship_in.skills else None,
        openings=internship_in.openings,
        qualifications=internship_in.qualifications,
        benefits=",".join(internship_in.benefits) if internship_in.benefits else None,
        contact_name=internship_in.contact_name,
        contact_email=internship_in.contact_email,
        contact_phone=internship_in.contact_phone,
        application_link=internship_in.application_link,
        application_email=internship_in.application_email
    )
    db.add(new_internship)
    db.commit()
    db.refresh(new_internship)

    return new_internship


@router.get("/my-internships", response_model=List[InternshipOut])
def get_my_posted_internships(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")

    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    if not employer:
        # Auto-create profile if missing for existing user (migration/fallback)
        employer = EmployerProfile(user_id=current_user.id)
        db.add(employer)
        db.commit()
        db.refresh(employer)
        
    return db.query(Internship).filter(Internship.employer_id == employer.id).all()


@router.get("/internships/{internship_id}")
def get_internship_details(
        internship_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """Get full internship details with employer information for employer preview."""
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")
    
    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    if not employer:
        raise HTTPException(status_code=404, detail="Employer profile not found")
    
    # Get internship - ensure it belongs to this employer
    internship = db.query(Internship).filter(
        Internship.id == internship_id,
        Internship.employer_id == employer.id
    ).first()
    
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
    
    return {
        "internship": {
            "id": internship.id,
            "title": internship.title,
            "description": internship.description,
            "location": internship.location,
            "mode": internship.mode,
            "duration_weeks": internship.duration_weeks,
            "start_date": internship.start_date,
            "end_date": None,  # Add if model has it
            "is_flexible_time": False,  # Add if model has it
            "stipend_amount": internship.stipend_amount,
            "stipend_currency": "INR",
            "stipend_cycle": "month",
            "deadline": internship.deadline,
            "skills_required": internship.skills,
            "qualifications": internship.qualifications,
            "benefits": internship.benefits,
            "openings": internship.openings or 1,
            "contact_name": internship.contact_name,
            "contact_email": internship.contact_email,
            "contact_phone": internship.contact_phone,
            "application_link": internship.application_link,
            "application_email": internship.application_email
        },
        "employer": {
            "id": employer.id,
            "company_name": employer.company_name,
            "organization_description": employer.organization_description,
            "city": employer.city,
            "industry": employer.industry,
            "employee_count": employer.employee_count,
            "logo_url": employer.logo_url,
            "website_url": employer.website_url,
            "is_verified": employer.is_verified or False,
            "contact_number": employer.contact_number
        }
    }


@router.get("/internships/{internship_id}/applications", response_model=List[ApplicationWithStudentOut])
def view_internship_applications(
        internship_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")

    # Check if this internship belongs to this employer
    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    if not employer:
        raise HTTPException(status_code=404, detail="Employer profile not found")

    internship = db.query(Internship).filter(
        Internship.id == internship_id,
        Internship.employer_id == employer.id
    ).first()

    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found or not yours")

    # Get all applications for this internship with student details
    applications = db.query(Application).options(
        joinedload(Application.student)
    ).filter(Application.internship_id == internship_id).all()

    # Manually populate resume data for each application
    results = []
    for app in applications:
        # Create a dictionary for the response
        student_data = {
            "id": app.student.id,
            "first_name": app.student.first_name,
            "last_name": app.student.last_name,
            "university_name": app.student.university_name,
            "skills": app.student.skills,
            "resume_file_path": None,
            "resume_filename": None,
            "resume_file_size": None,
            "resume_uploaded_at": None,
            "resume_json": None
        }
        
        app_data = {
            "id": app.id,
            "internship_id": app.internship_id,
            "status": app.status,
            "applied_at": app.applied_at,
            "student": student_data,
            "resume_file_path": None,
            "resume_json": None
        }
        
        # Get resume if it exists
        resume = db.query(StudentResume).filter(StudentResume.student_id == app.student.id).first()
        if resume:
            app_data["student"]["resume_file_path"] = resume.resume_file_path
            app_data["student"]["resume_filename"] = resume.resume_filename
            app_data["student"]["resume_file_size"] = resume.resume_file_size
            app_data["student"]["resume_uploaded_at"] = resume.resume_uploaded_at
            
            # Construct comprehensive resume_json
            resume_info = {
                "career_objective": resume.career_objective,
                "work_experience": resume.work_experience,
                "projects": resume.projects,
                "certifications": resume.certifications,
                "extra_curricular": resume.extra_curricular,
                "education_entries": resume.education_entries,
                "skills_categorized": resume.skills_categorized,
                "title": resume.title,
                "linkedin": resume.linkedin
            }
            import json
            resume_json_str = json.dumps(resume_info)
            app_data["student"]["resume_json"] = resume_json_str
            
            # Also set at top level for convenience
            app_data["resume_file_path"] = resume.resume_file_path
            app_data["resume_json"] = resume_json_str
            
        results.append(app_data)
        
    return results
