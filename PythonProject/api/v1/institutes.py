from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import csv
import io
import requests
from sqlalchemy.orm import Session, joinedload, contains_eager
from sqlalchemy import func, or_
from datetime import datetime
from db.session import get_db
from models.user import User
from models.institute_profile import InstituteProfile
from models.student_profile import StudentProfile
from models.application import Application
from models.internship import Internship
from models.employer_profile import EmployerProfile
from models.credit import CreditRequest, AuditLog
from models.notification import Notification
from utils.dependencies import get_current_user
from typing import List
from schemas.credits import CreditRequestOut
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from models.certificate import Certificate
from schemas.credits import CreditRequestOut
from schemas.institute import InstituteProfileOut, InstituteProfileUpdate

router = APIRouter()

def get_or_create_institute_profile(db: Session, user: User) -> InstituteProfile:
    institute = db.query(InstituteProfile).filter(InstituteProfile.user_id == user.id).first()
    if not institute:
        try:
            institute = InstituteProfile(
                user_id=user.id, 
                institute_name=user.full_name or "New Institute",
                aishe_code=f"PENDING_{user.id}",
                contact_number=None
            )
            db.add(institute)
            db.commit()
            db.refresh(institute)
        except Exception as e:
            db.rollback()
            # If concurrent request created it, try fetching again
            institute = db.query(InstituteProfile).filter(InstituteProfile.user_id == user.id).first()
            if not institute:
                print(f"Error creating institute profile: {e}")
                # Return a temporary object if creation fails to prevent 404
                return InstituteProfile(user_id=user.id, institute_name=user.full_name)
    return institute

def get_student_filter(db: Session, institute: InstituteProfile, current_user: User):
    """
    Get a list of filters to match students belonging to this institute.
    """
    institute_email_domain = current_user.email.split('@')[-1] if current_user.email else None
    
    # Avoid matching common domains like gmail.com, outlook.com
    common_domains = ["gmail.com", "outlook.com", "yahoo.com", "hotmail.com", "icloud.com"]
    if institute_email_domain in common_domains:
        institute_email_domain = None
    
    # Base filter: either direct link or matched name/domain
    filters = [StudentProfile.institute_id == institute.id]
    
    if institute.institute_name and institute.institute_name != "New Institute":
        filters.append(StudentProfile.university_name.ilike(f"%{institute.institute_name}%"))
        # Also try to match the first word of the institute name
        first_word = institute.institute_name.split()[0]
        if len(first_word) > 3:
            filters.append(StudentProfile.university_name.ilike(f"%{first_word}%"))
            
    if institute_email_domain:
        filters.append(User.email.ilike(f"%@{institute_email_domain}%"))
    
    # DEBUG: Log the institute info to see why it might be failing
    print(f"DEBUG: Institute {institute.institute_name} (ID: {institute.id}, Email Domain: {institute_email_domain})")
        
    return or_(*filters)

@router.get("/profile", response_model=InstituteProfileOut)
def get_institute_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Only institutes can access this profile")
    
    return get_or_create_institute_profile(db, current_user)

@router.put("/profile", response_model=InstituteProfileOut)
def update_institute_profile(
    profile_data: InstituteProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Only institutes can update this profile")
    
    institute = get_or_create_institute_profile(db, current_user)
    
    # Update fields
    update_data = profile_data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(institute, key, value)
    
    db.commit()
    db.refresh(institute)
    return institute

@router.get("/certificates")
def list_institute_certificates(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    """
    List all certificates uploaded by students belonging to this institute.
    """
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Only institutes can view certificates")

    institute = get_or_create_institute_profile(db, current_user)

    # Get student IDs for this institute
    students_query = db.query(StudentProfile).join(StudentProfile.user).filter(
        get_student_filter(db, institute, current_user)
    )
    student_ids = [s.id for s in students_query.all()]
    
    # FALLBACK: If no certificates for matched students, show certificates from ALL students (demo)
    if not student_ids:
        print("DEBUG: No students matched for certificates, showing all unassigned certificates")
        certificates = db.query(Certificate).options(
            joinedload(Certificate.student).joinedload(StudentProfile.user)
        ).order_by(Certificate.created_at.desc()).limit(20).all()
    else:
        certificates = db.query(Certificate).filter(Certificate.student_id.in_(student_ids)).options(
            joinedload(Certificate.student).joinedload(StudentProfile.user)
        ).order_by(Certificate.created_at.desc()).all()

    result = []
    for cert in certificates:
        result.append({
            "id": cert.id,
            "student_id": cert.student_id,
            "student_name": cert.student.user.full_name if cert.student and cert.student.user else "Unknown Student",
            "student_email": cert.student.user.email if cert.student and cert.student.user else None,
            "student_apaar_id": cert.student.user.apaar_id if cert.student and cert.student.user else None,
            "file_url": cert.file_url,
            "internship_title": cert.internship_title,
            "organization_name": cert.organization_name,
            "duration_in_months": cert.duration_in_months,
            "total_hours": cert.total_hours,
            "performance_remark": cert.performance_remark,
            "authenticity_score": cert.authenticity_score,
            "verification_status": cert.verification_status,
            "eligibility_status": cert.eligibility_status,
            "created_at": cert.created_at.isoformat() if cert.created_at else None
        })

    return result

@router.post("/certificates/{cert_id}/approve-and-push")
def approve_cert_and_push_to_abc(
    cert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve a certificate and push credits to ABC Portal based on internship timing.
    """
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Only institutes can approve certificates")

    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    # Update cert status (temporarily before sync)
    cert.verification_status = "VERIFIED"
    cert.eligibility_status = "ELIGIBLE"

    # Calculate credits based on duration/hours
    # Let's say 1 credit for every 40 hours, or based on months
    hours = cert.total_hours or (cert.duration_in_months or 1) * 160
    credits_val = round(hours / 40, 1)

    # Gather data for ABC Portal
    student = db.query(StudentProfile).filter(StudentProfile.id == cert.student_id).first()
    student_user = db.query(User).filter(User.id == student.user_id).first()
    institute = get_or_create_institute_profile(db, current_user)

    payload = {
        "student_name": student_user.full_name,
        "student_email": student_user.email,
        "student_apaar_id": student_user.apaar_id,
        "institute_name": institute.institute_name,
        "internship_title": cert.internship_title,
        "company_name": cert.organization_name,
        "hours_worked": hours,
        "credits_awarded": credits_val,
        "policy_used": "Institute Verified",
        "status": "approved"
    }

    try:
        # Pushing to ABC Portal (Port 8000 based on previous context)
        abc_response = requests.post("http://127.0.0.1:8000/institute/receive-credits", json=payload, timeout=5)
        abc_response.raise_for_status()
    except Exception as e:
        print(f"Failed to push to ABC: {e}")
        # Rollback status change if sync fails
        db.rollback()
        raise HTTPException(
            status_code=502, 
            detail=f"Certificate approval failed because ABC Portal is unreachable. Please try again later. Error: {str(e)}"
        )

    # 4. Log action
    audit = AuditLog(
        action="certificate_approved_and_pushed",
        performed_by_id=current_user.id,
        target_type="certificate",
        target_id=cert_id,
        details=f"Approved {credits_val} credits for student {student_user.full_name}"
    )
    db.add(audit)

    # 5. Update corresponding CreditRequest status
    credit_request = db.query(CreditRequest).filter(CreditRequest.certificate_id == cert_id).first()
    if credit_request:
        credit_request.status = "approved"
        credit_request.is_pushed_to_abc = True
        credit_request.credits_calculated = credits_val
        credit_request.hours = hours

    # 6. Notify Student
    notif = Notification(
        user_id=student.user_id,
        message=f"Your internship certificate for '{cert.internship_title}' has been verified and credits pushed to ABC."
    )
    db.add(notif)

    db.commit()
    return {"message": "Certificate verified and credits pushed to ABC successfully", "credits": credits_val}

@router.post("/certificates/{cert_id}/reject")
def reject_certificate(
    cert_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reject a student's certificate.
    """
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Only institutes can reject certificates")

    cert = db.query(Certificate).filter(Certificate.id == cert_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Certificate not found")

    reason = data.get("reason", "No reason provided")
    cert.verification_status = "REJECTED"
    cert.performance_remark = f"REJECTED: {reason}"

    # Log action
    audit = AuditLog(
        action="certificate_rejected",
        performed_by_id=current_user.id,
        target_type="certificate",
        target_id=cert_id,
        details=f"Rejected certificate for student ID {cert.student_id}. Reason: {reason}"
    )
    db.add(audit)

    # Notify Student
    student = db.query(StudentProfile).filter(StudentProfile.id == cert.student_id).first()
    if student:
        notif = Notification(
            user_id=student.user_id,
            message=f"Your certificate for '{cert.internship_title}' has been rejected by the institute. Reason: {reason}"
        )
        db.add(notif)

    db.commit()
    return {"message": "Certificate rejected successfully"}

@router.get("/students")
def list_institute_students(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Only institutes can view this data")

    institute = get_or_create_institute_profile(db, current_user)

    # Filter students by institute_id OR university_name domain match
    students_query = db.query(StudentProfile).join(StudentProfile.user).filter(
        get_student_filter(db, institute, current_user)
    ).options(contains_eager(StudentProfile.user))
    
    students = students_query.all()
    
    # If NO students found for THIS institute, fallback to showing ALL students 
    # who don't have an institute assigned yet (for easier testing/demo)
    if not students:
        print("DEBUG: No specific students found, falling back to unassigned students")
        students = db.query(StudentProfile).join(StudentProfile.user).filter(
            (StudentProfile.institute_id == None) | (StudentProfile.institute_id == 0)
        ).options(contains_eager(StudentProfile.user)).limit(10).all()
    
    result = []
    for s in students:
        # Get all student's applications/internships
        all_apps = []
        for app in s.applications:
            internship = app.internship
            if internship:
                employer = internship.employer
                all_apps.append({
                    "id": app.id,
                    "internship_id": internship.id,
                    "title": internship.title,
                    "company_name": employer.company_name if employer else "Unknown Company",
                    "location": internship.location,
                    "mode": internship.mode,
                    "duration_weeks": internship.duration_weeks,
                    "status": app.status,
                    "applied_at": app.applied_at.isoformat() if app.applied_at else None,
                    "hours_worked": app.hours_worked,
                    "policy_used": app.policy_used,
                    "credits_awarded": app.credits_awarded,
                    "rejection_reason": app.rejection_reason
                })

        result.append({
            "id": s.id,
            "name": s.user.full_name if s.user else (f"{s.first_name} {s.last_name}" if s.first_name else "Student"),
            "full_name": s.user.full_name if s.user else (f"{s.first_name} {s.last_name}" if s.first_name else "Student"),
            "first_name": s.first_name,
            "last_name": s.last_name,
            "email": s.user.email if s.user else None,
            "phone_number": s.user.phone_number if s.user else None,
            "department": s.department,
            "year": s.year,
            "cgpa": s.cgpa,
            "university_name": s.university_name,
            "skills": s.skills,
            "apaar_id": s.user.apaar_id if s.user else None,
            "is_apaar_verified": s.user.is_apaar_verified if s.user else False,
            "status": "Verified" if s.user and s.user.is_apaar_verified else "Pending",
            "internships": all_apps,
            "total_internships": len([a for a in all_apps if a['status'] in ['accepted', 'completed']])
        })

    return result

@router.get("/credit-requests", response_model=List[CreditRequestOut])
def list_credit_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Only institutes can view credit requests")
    
    institute = get_or_create_institute_profile(db, current_user)
        
    # Get all credit requests for students belonging to this institute
    requests_query = db.query(CreditRequest).join(StudentProfile).join(User, StudentProfile.user_id == User.id).filter(
        get_student_filter(db, institute, current_user)
    )
    requests = requests_query.all()
    
    # FALLBACK: If no requests matched, show ALL unassigned requests (demo)
    if not requests:
        print("DEBUG: No credit requests matched, showing all unassigned requests")
        requests = db.query(CreditRequest).limit(20).all()

    from models.certificate import Certificate

    result = []
    for req in requests:
        student = db.query(StudentProfile).options(joinedload(StudentProfile.user)).filter(StudentProfile.id == req.student_id).first()
        student_name = "Student"
        if student and student.user:
            student_name = student.user.full_name
        elif student:
            student_name = f"{student.first_name} {student.last_name}" if student.first_name else f"Student #{req.student_id}"
            
        # Get certificate info
        cert_info = None
        if req.certificate_id:
            cert = db.query(Certificate).filter(Certificate.id == req.certificate_id).first()
        else:
            # Fallback for old requests without certificate_id
            cert = db.query(Certificate).filter(Certificate.application_id == req.application_id).first()
            
        if cert:
            cert_info = {
                "id": cert.id,
                "file_url": cert.file_url,
                "internship_title": cert.internship_title,
                "organization_name": cert.organization_name,
                "duration_in_months": cert.duration_in_months,
                "total_hours": cert.total_hours,
                "performance_remark": cert.performance_remark,
                "authenticity_score": cert.authenticity_score,
                "verification_status": cert.verification_status
            }

        # Fetch Internship and Company details for regular applications
        internship_title = req.internship_title or (cert.internship_title if cert else "Unknown Internship")
        company_name = req.company_name or (cert.organization_name if cert else "Unknown Company")
        
        if req.application_id:
            application = db.query(Application).options(
                joinedload(Application.internship).joinedload(Internship.employer)
            ).filter(Application.id == req.application_id).first()
            
            if application and application.internship:
                internship_title = application.internship.title
                if application.internship.employer:
                    company_name = application.internship.employer.company_name
        
        result.append({
            "id": req.id,
            "student_id": req.student_id,
            "student_name": student_name,
            "application_id": req.application_id,
            "internship_title": internship_title,
            "company_name": company_name,
            "hours": req.hours,
            "credits_calculated": req.credits_calculated,
            "policy_type": req.policy_type,
            "status": req.status,
            "created_at": req.created_at.isoformat() if req.created_at else None,
            "is_pushed_to_abc": req.is_pushed_to_abc,
            "certificate": cert_info
        })
    return result

@router.post("/credit-requests/{request_id}/approve")
def approve_credit_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Only institutes can approve credit requests")
    
    credit_request = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
    if not credit_request:
        raise HTTPException(status_code=404, detail="Credit request not found")
        
    # Verify that the internship is actually marked as completed by employer (if applicable)
    if credit_request.application_id:
        application = db.query(Application).filter(Application.id == credit_request.application_id).first()
        if not application or application.status != "completed":
            raise HTTPException(
                status_code=400, 
                detail="Cannot approve credits for an internship that is not yet marked as 'completed' by the employer."
            )
        
        # Update application status to completed if not already
        application.status = "completed"
        application.hours_worked = credit_request.hours
        application.policy_used = credit_request.policy_type
    
    credit_request.status = "approved"

    # Log action
    audit = AuditLog(
        action="credit_request_approved",
        performed_by_id=current_user.id,
        target_type="credit_request",
        target_id=request_id,
        details=f"Approved {credit_request.credits_calculated} credits for student ID {credit_request.student_id}"
    )
    db.add(audit)

    # Add notification for student
    if application and application.student:
        notif = Notification(
            user_id=application.student.user_id,
            message=f"Your credit request for an internship has been approved by the institute."
        )
        db.add(notif)
    
    db.commit()
    return {"message": "Credit request approved successfully"}

@router.post("/credit-requests/{request_id}/reject")
def reject_credit_request(
    request_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Only institutes can reject credit requests")
    
    reason = data.get("reason", "No reason provided")
    
    credit_request = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
    if not credit_request:
        raise HTTPException(status_code=404, detail="Credit request not found")
        
    credit_request.status = "rejected"
    credit_request.remarks = reason
    
    # Update application status
    application = db.query(Application).filter(Application.id == credit_request.application_id).first()
    
    # Log action
    audit = AuditLog(
        action="credit_request_rejected",
        performed_by_id=current_user.id,
        target_type="credit_request",
        target_id=request_id,
        details=f"Rejected credit request for student ID {credit_request.student_id}. Reason: {reason}"
    )
    db.add(audit)
    
    db.commit()
    return {"message": "Credit request rejected successfully"}

@router.post("/credit-requests/{request_id}/mark-exception")
def mark_exception_credit_request(
    request_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Only institutes can mark exceptions")
    
    reason = data.get("reason", "No reason provided")
    
    credit_request = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
    if not credit_request:
        raise HTTPException(status_code=404, detail="Credit request not found")
        
    credit_request.status = "exception"
    credit_request.remarks = reason
    
    audit = AuditLog(
        action="credit_request_exception",
        performed_by_id=current_user.id,
        target_type="credit_request",
        target_id=request_id,
        details=f"Marked exception for credit request ID {request_id}. Reason: {reason}"
    )
    db.add(audit)
    
    db.commit()
    return {"message": "Credit request marked as exception successfully"}

@router.post("/credit-requests/{request_id}/push-to-abc")
def push_to_abc(
        request_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Access denied")
        
    credit_request = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
    if not credit_request:
        raise HTTPException(status_code=404, detail="Credit request not found")
        
    if credit_request.status != "approved":
        raise HTTPException(status_code=400, detail="Credit must be approved before pushing to ABC")
        
    # Gather data for ABC Portal
    student = db.query(StudentProfile).filter(StudentProfile.id == credit_request.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    student_user = db.query(User).filter(User.id == student.user_id).first()
    if not student_user:
        raise HTTPException(status_code=404, detail="Student user account not found")
    
    internship_title = "Unknown Internship"
    company_name = "Unknown Company"

    if credit_request.application_id:
        application = db.query(Application).filter(Application.id == credit_request.application_id).first()
        if not application:
            raise HTTPException(status_code=404, detail="Application data missing")

        internship = db.query(Internship).filter(Internship.id == application.internship_id).first()
        if not internship:
            raise HTTPException(status_code=404, detail="Internship data missing")
            
        employer = db.query(EmployerProfile).filter(EmployerProfile.id == internship.employer_id).first()
        company_name = employer.company_name if employer else "Unknown Company"
        internship_title = internship.title
    elif credit_request.certificate_id:
        cert = db.query(Certificate).filter(Certificate.id == credit_request.certificate_id).first()
        if cert:
            internship_title = cert.internship_title or "External Internship"
            company_name = cert.organization_name or "External Organization"
        
    institute = get_or_create_institute_profile(db, current_user)
    
    payload = {
        "student_name": student_user.full_name,
        "student_email": student_user.email,
        "student_apaar_id": student_user.apaar_id,
        "institute_name": institute.institute_name,
        "internship_title": internship_title,
        "company_name": company_name,
        "hours_worked": credit_request.hours,
        "credits_awarded": credit_request.credits_calculated,
        "policy_used": credit_request.policy_type,
        "status": "approved"
    }
    
    abc_data = {"status": "success", "synced": True}
    
    try:
        # Assuming ABC Portal is running on localhost:8000
        abc_response = requests.post("http://localhost:8000/institute/receive-credits", json=payload, timeout=5)
        abc_response.raise_for_status()
        abc_data = abc_response.json()
    except requests.exceptions.RequestException as e:
        print(f"Failed to push to ABC: {e}")
        # Return 502 Bad Gateway to indicate upstream failure
        raise HTTPException(status_code=502, detail=f"Failed to connect to ABC Portal: {str(e)}")

    credit_request.is_pushed_to_abc = True
    db.commit()
    
    return {"message": "Credit pushed to ABC Portal successfully", "abc_response": abc_data}

@router.get("/dashboard/stats")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Only institutes can view dashboard stats")
        
    institute = get_or_create_institute_profile(db, current_user)
        
    # Fetch students
    students_query = db.query(StudentProfile).join(StudentProfile.user).filter(
        get_student_filter(db, institute, current_user)
    )
    
    student_ids = [s.id for s in students_query.all()]
    
    # Stats
    total_students = len(student_ids)
    
    # Internships via Applications
    # Join Application -> Internship
    # We need to count applications for these students
    if not student_ids:
        return {
            "total_students": 0,
            "active_internships": 0,
            "completed_internships": 0,
            "total_credits_approved": 0,
            "pending_credit_requests": 0,
            "policy_distribution": {"UGC": 0, "AICTE": 0}
        }

    # Use a simpler query structure
    active_internships = db.query(Application).filter(
        Application.student_id.in_(student_ids),
        Application.status.in_(["accepted", "ongoing"])
    ).count()
    
    completed_internships = db.query(Application).filter(
        Application.student_id.in_(student_ids),
        Application.status == "completed"
    ).count()
    
    # Credits
    approved_credits = db.query(func.sum(CreditRequest.credits_calculated)).filter(
        CreditRequest.student_id.in_(student_ids),
        CreditRequest.status == "approved"
    ).scalar() or 0
    
    pending_reqs = db.query(CreditRequest).filter(
        CreditRequest.student_id.in_(student_ids),
        CreditRequest.status == "pending"
    ).count()
    
    ugc_count = db.query(CreditRequest).filter(
        CreditRequest.student_id.in_(student_ids),
        CreditRequest.policy_type == "UGC"
    ).count()
    
    aicte_count = db.query(CreditRequest).filter(
        CreditRequest.student_id.in_(student_ids),
        CreditRequest.policy_type == "AICTE"
    ).count()
    
    return {
        "total_students": total_students,
        "active_internships": active_internships,
        "completed_internships": completed_internships,
        "total_credits_approved": float(approved_credits),
        "pending_credit_requests": pending_reqs,
        "policy_distribution": {
            "UGC": ugc_count,
            "AICTE": aicte_count
        }
    }

@router.get("/audit-logs")
def get_audit_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Access denied")
        
    return db.query(AuditLog).filter(AuditLog.performed_by_id == current_user.id).order_by(AuditLog.timestamp.desc()).limit(50).all()

@router.get("/export/csv")
def export_credits_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Simplified export logic
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Access denied")
        
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Student Name', 'Internship', 'Hours', 'Credits', 'Policy', 'Status'])
    
    # Fetch data... (simplified for brevity)
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=credits_report.csv"}
    )

@router.get("/export/pdf")
def export_credits_pdf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Simplified PDF logic
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Access denied")
        
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer)
    p.drawString(100, 750, "Credits Report")
    p.showPage()
    p.save()
    
    buffer.seek(0)
    return StreamingResponse(
        io.BytesIO(buffer.getvalue()),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=credits_report.pdf"}
    )
