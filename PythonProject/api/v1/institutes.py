from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import csv
import io
import requests
from sqlalchemy.orm import Session, joinedload, contains_eager
from sqlalchemy import func
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

router = APIRouter()

@router.get("/students")
def list_institute_students(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Only institutes can view this data")

    institute = db.query(InstituteProfile).filter(InstituteProfile.user_id == current_user.id).first()
    if not institute:
        raise HTTPException(status_code=404, detail="Institute profile not found")

    # Filter students by institute_id OR university_name domain match
    # Get the domain from institute email for stricter matching if needed
    institute_email_domain = current_user.email.split('@')[-1] if current_user.email else None
    
    students_query = db.query(StudentProfile).join(StudentProfile.user).filter(
        (StudentProfile.institute_id == institute.id) | 
        (StudentProfile.university_name.ilike(f"%{institute.institute_name}%")) |
        (User.email.ilike(f"%@{institute_email_domain}%") if institute_email_domain else False)
    ).options(contains_eager(StudentProfile.user))
    
    students = students_query.all()
    
    print(f"DEBUG: Found {len(students)} students")
    
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
    
    institute = db.query(InstituteProfile).filter(InstituteProfile.user_id == current_user.id).first()
    if not institute:
        raise HTTPException(status_code=404, detail="Institute profile not found")
        
    # Get all credit requests for students belonging to this institute or matching the email domain
    institute_email_domain = current_user.email.split('@')[-1] if current_user.email else None
    
    requests = db.query(CreditRequest).join(StudentProfile).join(User, StudentProfile.user_id == User.id).filter(
        (StudentProfile.institute_id == institute.id) | 
        (StudentProfile.university_name.ilike(f"%{institute.institute_name}%")) |
        (User.email.ilike(f"%@{institute_email_domain}%") if institute_email_domain else False)
    ).all()

    result = []
    for req in requests:
        student = db.query(StudentProfile).options(joinedload(StudentProfile.user)).filter(StudentProfile.id == req.student_id).first()
        student_name = "Student"
        if student and student.user:
            student_name = student.user.full_name
        elif student:
            student_name = f"{student.first_name} {student.last_name}" if student.first_name else f"Student #{req.student_id}"
            
        # Fetch Internship and Company details
        application = db.query(Application).options(
            joinedload(Application.internship).joinedload(Internship.employer)
        ).filter(Application.id == req.application_id).first()
        
        internship_title = "Unknown Internship"
        company_name = "Unknown Company"
        
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
            "is_pushed_to_abc": req.is_pushed_to_abc
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
        
    # Verify that the internship is actually marked as completed by employer
    application = db.query(Application).filter(Application.id == credit_request.application_id).first()
    if not application or application.status != "completed":
        raise HTTPException(
            status_code=400, 
            detail="Cannot approve credits for an internship that is not yet marked as 'completed' by the employer."
        )

    credit_request.status = "approved"
    
    # Update application status to completed if not already
    if application:
        application.status = "completed"
        application.hours_worked = credit_request.hours
        application.policy_used = credit_request.policy_type

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
    
    application = db.query(Application).filter(Application.id == credit_request.application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application data missing")

    internship = db.query(Internship).filter(Internship.id == application.internship_id).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship data missing")
        
    employer = db.query(EmployerProfile).filter(EmployerProfile.id == internship.employer_id).first()
    company_name = employer.company_name if employer else "Unknown Company"
    
    institute = db.query(InstituteProfile).filter(InstituteProfile.user_id == current_user.id).first()
    
    payload = {
        "student_name": student_user.full_name,
        "student_email": student_user.email,
        "student_apaar_id": student_user.apaar_id,
        "institute_name": institute.institute_name,
        "internship_title": internship.title,
        "company_name": company_name,
        "hours_worked": credit_request.hours,
        "credits_awarded": credit_request.credits_calculated,
        "policy_used": credit_request.policy_type,
        "status": "approved"
    }
    
    abc_data = {"status": "success", "synced": True}
    
    try:
        # Assuming ABC Portal is running on localhost:8002
        abc_response = requests.post("http://localhost:8002/institute/receive-credits", json=payload, timeout=5)
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
        
    institute = db.query(InstituteProfile).filter(InstituteProfile.user_id == current_user.id).first()
    if not institute:
        return {
            "total_students": 0,
            "active_internships": 0,
            "completed_internships": 0,
            "total_credits_approved": 0,
            "pending_credit_requests": 0,
            "policy_distribution": {"UGC": 0, "AICTE": 0}
        }
        
    # Fetch students
    institute_email_domain = current_user.email.split('@')[-1] if current_user.email else None
    students_query = db.query(StudentProfile).join(StudentProfile.user).filter(
        (StudentProfile.institute_id == institute.id) | 
        (StudentProfile.university_name.ilike(f"%{institute.institute_name}%")) |
        (User.email.ilike(f"%@{institute_email_domain}%") if institute_email_domain else False)
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
