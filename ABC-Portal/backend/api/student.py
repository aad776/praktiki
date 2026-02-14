from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List
from backend.database import get_db
from backend.models.notification import Notification
from backend.models.user import User, EmployerProfile
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
    
    # Eager load relationships for applications
    applications = db.query(Application).\
        options(joinedload(Application.internship)).\
        filter(Application.student_id == current_user.id).all()
    
    # Get all credits (approved and pushed to ABC)
    credits = db.query(CreditRequest).filter(
        CreditRequest.student_id == current_user.id,
        CreditRequest.is_pushed_to_abc == True
    ).all()
    total_credits = sum(c.credits_calculated for c in credits if c.status == "approved")
    
    return {
        "applications": applications,
        "credits": credits,
        "total_credits": total_credits
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
    
    # Check if already applied
    existing = db.query(Application).filter(
        Application.internship_id == internship_id,
        Application.student_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already applied for this internship")
    
    new_app = Application(
        internship_id=internship_id,
        student_id=current_user.id,
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
    
    return db.query(CreditRequest).filter(
        CreditRequest.student_id == current_user.id,
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
