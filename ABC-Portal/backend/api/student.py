from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from backend.database import get_db
from backend.models.notification import Notification
from backend.models.user import User, EmployerProfile, StudentProfile
from backend.models.internship import Internship, Application, ApplicationStatus
from backend.models.credit import CreditRequest
from backend.schemas.internship import InternshipResponse, ApplicationResponse
from backend.schemas.credit import CreditRequestResponse
from backend.core.security import get_current_user
from backend.services.audit import create_audit_log

router = APIRouter(prefix="/student", tags=["Student"])


@router.get("/dashboard")
def student_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get StudentProfile
    student_profile = current_user.student_profile
    if not student_profile:
        return {
            "applications": [],
            "credits": [],
            "total_credits": 0
        }

    # Eager load relationships for applications
    applications = db.query(Application).\
        options(
            joinedload(Application.internship).joinedload(Internship.employer).joinedload(EmployerProfile.user)
        ).\
        filter(Application.student_id == student_profile.id).all()
    
    # Get all credit requests for summary calculation
    # Also eager load application and internship details for the list response
    all_credits = db.query(CreditRequest).filter(
            CreditRequest.student_id == student_profile.id
        ).all()
    
    # Calculate summary stats similar to Main Portal
    summary_total_credits = sum(c.credits_calculated for c in all_credits)
    summary_approved_credits = sum(c.credits_calculated for c in all_credits if c.status == "approved")
    summary_pending_credits = sum(c.credits_calculated for c in all_credits if c.status == "pending")
    summary_total_hours = sum(c.hours for c in all_credits if c.status == "approved")

    # Return ALL credits to the frontend, not just pushed ones, so the student can see full history
    # The frontend can filter or show status if needed
    
    # Eager load relationships for the credit list in dashboard
    all_credits_with_details = db.query(CreditRequest).\
        options(
            joinedload(CreditRequest.application).joinedload(Application.internship).joinedload(Internship.employer).joinedload(EmployerProfile.user),
            joinedload(CreditRequest.student).joinedload(StudentProfile.user)
        ).\
        filter(
            CreditRequest.student_id == student_profile.id
        ).all()

    return {
        "applications": [ApplicationResponse.model_validate(app) for app in applications],
        "credits": [CreditRequestResponse.model_validate(c) for c in all_credits_with_details],
        "total_credits": summary_total_credits, 
        "credit_summary": {
            "total_credits": summary_total_credits,
            "approved_credits": summary_approved_credits,
            "pending_credits": summary_pending_credits,
            "total_hours": summary_total_hours
        }
    }

@router.get("/internships", response_model=List[InternshipResponse])
def get_available_internships(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Return all active internships
    return db.query(Internship).filter(Internship.status == "active").all()

@router.post("/apply/{internship_id}")
def apply_for_internship(internship_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    student_profile = current_user.student_profile
    if not student_profile:
        raise HTTPException(status_code=400, detail="Student profile not found. Please complete your profile.")

    # Check if already applied
    existing = db.query(Application).filter(
        Application.internship_id == internship_id,
        Application.student_id == student_profile.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already applied for this internship")
    
    new_app = Application(
        internship_id=internship_id,
        student_id=student_profile.id,
        status="applied"
    )
    db.add(new_app)
    
    # Add notification for employer
    internship = db.query(Internship).filter(Internship.id == internship_id).first()
    if internship:
        employer = db.query(EmployerProfile).filter(EmployerProfile.id == internship.employer_id).first()
        if employer:
            notif = Notification(
                user_id=employer.user_id,
                message=f"New application received for your internship: '{internship.title}' from {current_user.full_name}."
            )
            db.add(notif)
            
    db.commit()
    
    create_audit_log(db, "APPLY_INTERNSHIP", current_user.id, f"Applied for internship ID: {internship_id}")
    
    return {"message": "Application submitted"}

@router.get("/credits", response_model=List[CreditRequestResponse])
def get_my_credits(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    student_profile = current_user.student_profile
    if not student_profile:
        return []

    return db.query(CreditRequest).filter(
        CreditRequest.student_id == student_profile.id,
        CreditRequest.is_pushed_to_abc == True
    ).all()

@router.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "apaar_id": current_user.apaar_id,
        "is_apaar_verified": current_user.is_apaar_verified
    }
