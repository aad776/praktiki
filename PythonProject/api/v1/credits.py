from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from models.user import User
from models.credit import CreditRequest, AuditLog
from models.application import Application
from models.student_profile import StudentProfile
from schemas.credits import CreditRequestCreate, CreditRequestOut, CreditSummary, AuditLogOut
from utils.dependencies import get_current_user
from utils.credits import calculate_credits
from models.notification import Notification
from typing import List
from models.institute_profile import InstituteProfile

router = APIRouter()

@router.post("/request", response_model=CreditRequestOut)
def request_credits(
    request_data: CreditRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can request credits")
    
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    # Check if application exists and belongs to student
    application = db.query(Application).filter(
        Application.id == request_data.application_id,
        Application.student_id == student.id
    ).first()
    
    if not application:
        raise HTTPException(status_code=404, detail="Application not found or does not belong to you")
        
    # NEW: Check if application is completed
    if application.status != "completed":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot request credits for an internship with status: {application.status}. Internship must be 'completed' first."
        )

    # Check if a credit request already exists for this application
    existing_request = db.query(CreditRequest).filter(
        CreditRequest.application_id == request_data.application_id
    ).first()
    if existing_request:
        raise HTTPException(status_code=400, detail="Credit request already exists for this internship")
        
    # Calculate credits
    credits_val = calculate_credits(request_data.hours, request_data.policy_type)
    
    new_request = CreditRequest(
        student_id=student.id,
        application_id=request_data.application_id,
        hours=request_data.hours,
        credits_calculated=credits_val,
        policy_type=request_data.policy_type,
        status="pending"
    )
    
    db.add(new_request)
    
    # Log the action
    audit = AuditLog(
        action="credit_request_created",
        performed_by_id=current_user.id,
        target_type="credit_request",
        details=f"Requested {credits_val} credits for {request_data.hours} hours using {request_data.policy_type} policy"
    )
    db.add(audit)
    
    # Notification for institute
    if student.institute_id:
        institute = db.query(InstituteProfile).filter(InstituteProfile.id == student.institute_id).first()
        if institute:
            notif = Notification(
                user_id=institute.user_id,
                message=f"New credit request from student {student.first_name} {student.last_name} for '{application.internship.title}'."
            )
            db.add(notif)
    
    db.commit()
    db.refresh(new_request)
    return new_request

@router.get("/summary", response_model=CreditSummary)
def get_credit_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access credit summary")
    
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    requests = db.query(CreditRequest).filter(CreditRequest.student_id == student.id).all()
    
    total_credits = sum(r.credits_calculated for r in requests)
    approved_credits = sum(r.credits_calculated for r in requests if r.status == "approved")
    pending_credits = sum(r.credits_calculated for r in requests if r.status == "pending")
    total_hours = sum(r.hours for r in requests if r.status == "approved")
    
    return CreditSummary(
        total_credits=total_credits,
        approved_credits=approved_credits,
        pending_credits=pending_credits,
        total_hours=total_hours
    )

@router.get("/my-requests", response_model=List[CreditRequestOut])
def get_my_credit_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can view their credit requests")
    
    student = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    return db.query(CreditRequest).filter(CreditRequest.student_id == student.id).all()

@router.get("/audit-logs", response_model=List[AuditLogOut])
def get_audit_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Only staff or admins? For now allow the user to see their own logs or maybe just allow all for demo
    return db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(50).all()
