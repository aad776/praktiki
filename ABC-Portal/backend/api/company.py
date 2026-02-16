from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend.database import get_db
from backend.models.user import User, UserRole
from backend.models.internship import Internship, Application, ApplicationStatus
from backend.models.credit import CreditRequest, CreditStatus
from backend.schemas.internship import InternshipCreate, InternshipResponse, ApplicationResponse, CompletionRequest, RejectRequest
from backend.core.security import get_current_user
from backend.services.credit_engine import calculate_credits
from backend.services.audit import create_audit_log

from backend.models.notification import Notification

router = APIRouter(prefix="/company", tags=["Company"])

@router.post("/internship", response_model=InternshipResponse)
def post_internship(internship: InternshipCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    new_internship = Internship(
        title=internship.title,
        description=internship.description,
        company_id=current_user.id,
        duration=internship.duration,
        expected_hours=internship.expected_hours,
        policy=internship.policy,
        start_date=internship.start_date,
        end_date=internship.end_date
    )
    db.add(new_internship)
    db.commit()
    db.refresh(new_internship)
    
    # Log action
    create_audit_log(db, "POST_INTERNSHIP", current_user.id, f"Posted internship: {new_internship.title}")

    return new_internship

@router.get("/applications", response_model=List[ApplicationResponse])
def view_applications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all applications for internships posted by this company
    apps = db.query(Application).join(Internship).filter(Internship.company_id == current_user.id).all()
    return apps

@router.post("/application/{app_id}/accept")
def accept_application(app_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if app.internship.company_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your intern")
    
    app.status = ApplicationStatus.ACCEPTED
    
    # Add notification for student
    notif = Notification(
        user_id=app.student.user_id,
        message=f"Congratulations! Your application for '{app.internship.title}' has been accepted by the company."
    )
    db.add(notif)
    
    db.commit()
    
    create_audit_log(db, "ACCEPT_APPLICATION", current_user.id, f"Accepted application {app.id}")
    
    return {"message": "Application accepted successfully"}

@router.post("/application/{app_id}/complete")
def complete_internship(app_id: int, completion: CompletionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if app.internship.company_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your intern")
    
    # Forward to Institute for Review (Institute will calculate credits)
    app.status = ApplicationStatus.INSTITUTE_REVIEW
    app.hours_worked = completion.hours
    app.policy_used = app.internship.policy
    
    # We do NOT calculate credits here anymore. 
    # The Company simply attests to the hours.
    
    db.add(app)
    
    # Add notification for student
    notif = Notification(
        user_id=app.student.user_id,
        message=f"Your internship for '{app.internship.title}' has been marked as completed by the company. It is now pending institute verification."
    )
    db.add(notif)

    db.commit()
    
    create_audit_log(db, "COMPLETE_INTERNSHIP", current_user.id, f"Marked application {app.id} as completed with {completion.hours} hours. Sent to Institute.")

    return {"message": "Internship marked as completed. Pending Institute verification."}

@router.post("/application/{app_id}/reject")
def reject_application(app_id: int, reject_data: RejectRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.COMPANY:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    app = db.query(Application).filter(Application.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")
    
    if app.internship.company_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your intern")
    
    app.status = ApplicationStatus.REJECTED
    app.rejection_reason = reject_data.reason
    
    # Add notification for student
    notif = Notification(
        user_id=app.student.user_id,
        message=f"Your application for '{app.internship.title}' has been rejected by the company. Reason: {reject_data.reason}"
    )
    db.add(notif)

    db.commit()
    
    # Send Rejection Email (Mock)
    print(f"========================================")
    print(f"REJECTION EMAIL SENT TO: {app.student.email}")
    print(f"SUBJECT: Internship Application Update")
    print(f"Dear {app.student.username},")
    print(f"Your application for {app.internship.title} has been rejected.")
    print(f"Reason: {reject_data.reason}")
    print(f"========================================")
    
    create_audit_log(db, "REJECT_APPLICATION", current_user.id, f"Rejected application {app_id} for reason: {reject_data.reason}")
    
    return {"message": "Application rejected successfully"}
