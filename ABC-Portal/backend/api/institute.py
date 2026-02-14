from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import List
import csv
import io
from backend.database import get_db
from backend.models.user import User
from backend.models.credit import CreditRequest, CreditStatus
from backend.schemas.credit import CreditRequestResponse
from backend.core.security import get_current_user
from backend.services.audit import create_audit_log
from backend.services.analytics_service import institute_dashboard, get_institute_name
from backend.models.internship import Internship, Application, ApplicationStatus
from backend.schemas.internship import ApplicationResponse

from backend.models.notification import Notification

router = APIRouter(prefix="/institute", tags=["Institute"])

@router.get("/dashboard")
def institute_dashboard_api(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    return institute_dashboard(db, user=current_user)

@router.get("/applications", response_model=List[ApplicationResponse])
def get_institute_applications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    institute_name = get_institute_name(db, current_user)
    if not institute_name:
        return []

    from backend.models.student_profile import StudentProfile
    apps = db.query(Application).join(StudentProfile, Application.student_id == StudentProfile.id)\
             .options(joinedload(Application.internship))\
             .filter(StudentProfile.university_name.ilike(f"%{institute_name}%"))\
             .all()
    
    return apps

@router.get("/credits", response_model=List[CreditRequestResponse])
def get_institute_credits(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    institute_name = get_institute_name(db, current_user)
    if not institute_name:
        return []

    from backend.models.student_profile import StudentProfile
    credits = db.query(CreditRequest).join(StudentProfile, CreditRequest.student_id == StudentProfile.id)\
                .filter(StudentProfile.university_name.ilike(f"%{institute_name}%"))\
                .all()
    
    return credits

@router.post("/credit/{request_id}/approve")
def approve_credit_request(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    req = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Credit request not found")
        
    req.status = "approved"
    
    # Add notification for student
    from backend.models.user import StudentProfile
    student = db.query(StudentProfile).filter(StudentProfile.id == req.student_id).first()
    if student:
        notif = Notification(
            user_id=student.user_id,
            message=f"Your credit request for an internship has been approved by the institute."
        )
        db.add(notif)
        
    db.commit()
    
    create_audit_log(db, "APPROVE_CREDIT", current_user.id, f"Approved credit request {request_id}")
    return {"message": "Credit request approved"}

@router.post("/credit/{request_id}/reject")
def reject_credit_request(request_id: int, reason: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    req = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Credit request not found")
        
    req.status = "rejected"
    # Optionally store reason in a field if added to model
    
    # Add notification for student
    from backend.models.user import StudentProfile
    student = db.query(StudentProfile).filter(StudentProfile.id == req.student_id).first()
    if student:
        notif = Notification(
            user_id=student.user_id,
            message=f"Your credit request for an internship has been rejected by the institute. Reason: {reason}"
        )
        db.add(notif)

    db.commit()
    
    create_audit_log(db, "REJECT_CREDIT", current_user.id, f"Rejected credit request {request_id}: {reason}")
    return {"message": "Credit request rejected"}
