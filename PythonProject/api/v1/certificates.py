from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlalchemy.orm import Session
from db.session import get_db
from models.user import User
from models.student_profile import StudentProfile
from models.application import Application
from models.certificate import Certificate
from schemas.certificate import CertificateCreate, CertificateResponse
from utils.dependencies import get_current_student, get_current_user
from typing import List
import shutil
import os
import uuid
from datetime import datetime

from services.certification.certificate_verification_service import process_certificate_verification
from services.certification.verification import run_verification_workflow

from models.credit import CreditRequest, AuditLog
from models.notification import Notification
from models.institute_profile import InstituteProfile
from utils.credits import calculate_credits

router = APIRouter()

def process_certificate_background(
    db_session: Session, 
    cert_id: int, 
    file_path: str, 
    student_id: int, 
    user: User,
    hours: int = None,
    policy_type: str = "UGC"
):
    """Background task for certificate processing and automated credit request"""
    try:
        # Get certificate and user from db session
        cert = db_session.query(Certificate).filter(Certificate.id == cert_id).first()
        if not cert:
            return
            
        # 1. Run extraction logic
        verification_data, _ = process_certificate_verification(db_session, file_path, student_id)
        
        # 2. Run workflow (Validate eligibility)
        run_verification_workflow(db_session, cert, user, verification_data["ai_extracted_data"])
        
        # 3. Automatically create CreditRequest entry (Idempotency check)
        if cert.application_id:
            existing_request = db_session.query(CreditRequest).filter(
                CreditRequest.application_id == cert.application_id
            ).first()
            
            if not existing_request:
                # Use provided hours or extracted hours
                final_hours = hours or cert.total_hours or 0
                credits_val = calculate_credits(final_hours, policy_type)
                
                new_request = CreditRequest(
                    student_id=student_id,
                    application_id=cert.application_id,
                    hours=final_hours,
                    credits_calculated=credits_val,
                    policy_type=policy_type,
                    status="pending"
                )
                db_session.add(new_request)
                
                # Log the action
                audit = AuditLog(
                    action="automated_credit_request_created",
                    performed_by_id=user.id,
                    target_type="credit_request",
                    details=f"Automated: Requested {credits_val} credits for {final_hours} hours using {policy_type} policy after certificate upload"
                )
                db_session.add(audit)
                
                # 4. Notify institute dashboard
                student_profile = db_session.query(StudentProfile).filter(StudentProfile.id == student_id).first()
                if student_profile and student_profile.institute_id:
                    institute = db_session.query(InstituteProfile).filter(InstituteProfile.id == student_profile.institute_id).first()
                    if institute:
                        notif = Notification(
                            user_id=institute.user_id,
                            message=f"New automated credit request from student {user.full_name} for certificate upload."
                        )
                        db_session.add(notif)
        
        # Update certificate
        db_session.add(cert)
        db_session.commit()
    except Exception as e:
        print(f"Background processing error: {e}")
        db_session.rollback()

@router.post("/upload", response_model=CertificateResponse, status_code=status.HTTP_201_CREATED)
def upload_certificate(
    background_tasks: BackgroundTasks,
    application_id: int = None,
    hours: int = None,
    policy_type: str = "UGC",
    file: UploadFile = File(...),
    current_student: User = Depends(get_current_student),
    db: Session = Depends(get_db)
):
    """
    Upload a certificate for verification.
    Automatically creates a CreditRequest if application_id is provided.
    """
    # Ensure student profile exists
    student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_student.id).first()
    if not student_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Student profile not found. Please complete your profile first."
        )

    # Validate application_id if provided
    if application_id:
        app = db.query(Application).filter(Application.id == application_id, Application.student_id == student_profile.id).first()
        if not app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Internship application not found or doesn't belong to you."
            )
        
        # Verify that application status is COMPLETED
        if app.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot upload certificate for an internship with status: {app.status}. Internship must be 'completed' first."
            )

    # Ensure uploads directory exists
    upload_dir = "secure_uploads/certificates"
    os.makedirs(upload_dir, exist_ok=True)
    
    file_extension = file.filename.split(".")[-1]
    file_name = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(upload_dir, file_name)
    
    # Save the file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {str(e)}"
        )
        
    # Create certificate record
    new_cert = Certificate(
        student_id=student_profile.id,
        application_id=application_id, # Link to application
        student_name=current_student.full_name, # Auto-attach student name
        file_url=file_path,
        verification_status="PENDING"
    )
    
    db.add(new_cert)
    db.commit()
    db.refresh(new_cert)
    
    # Add background task for verification
    background_tasks.add_task(
        process_certificate_background,
        db,
        new_cert.id,
        file_path,
        student_profile.id,
        current_student,
        hours,
        policy_type
    )
    
    return new_cert

@router.get("/", response_model=List[CertificateResponse])
def get_my_certificates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get certificates. 
    Students see their own certificates.
    Admins/Institutes see all certificates (or filtered by role logic).
    """
    if current_user.role == "student":
        student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not student_profile:
            return []
        return db.query(Certificate).filter(Certificate.student_id == student_profile.id).all()
    
    elif current_user.role in ["admin", "institute"]:
        return db.query(Certificate).all()
    
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to view certificates"
        )

@router.get("/{certificate_id}", response_model=CertificateResponse)
def get_certificate(
    certificate_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")
    
    # Check permissions
    if current_user.role == "student":
        student_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
        if not student_profile or cert.student_id != student_profile.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this certificate")
            
    return cert
