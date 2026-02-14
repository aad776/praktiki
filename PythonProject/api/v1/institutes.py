from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
import csv
import io
from sqlalchemy.orm import Session, joinedload
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
    
    from sqlalchemy.orm import contains_eager
    
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
            
        result.append({
            "id": req.id,
            "student_id": req.student_id,
            "student_name": student_name,
            "application_id": req.application_id,
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
        
    # NEW: Verify that the internship is actually marked as completed by employer
    application = db.query(Application).filter(Application.id == credit_request.application_id).first()
    if not application or application.status != "completed":
        raise HTTPException(
            status_code=400, 
            detail="Cannot approve credits for an internship that is not yet marked as 'completed' by the employer."
        )

    credit_request.status = "approved"
    
    # Update application status to completed if not already
    application = db.query(Application).filter(Application.id == credit_request.application_id).first()
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
    if application:
        application.status = "rejected"
        application.rejection_reason = reason
    
    # Log action
    audit = AuditLog(
        action="credit_request_rejected",
        performed_by_id=current_user.id,
        target_type="credit_request",
        target_id=request_id,
        details=f"Rejected credit request ID {request_id}: {reason}"
    )
    db.add(audit)

    # Add notification for student
    if application and application.student:
        notif = Notification(
            user_id=application.student.user_id,
            message=f"Your credit request for an internship has been rejected by the institute. Reason: {reason}"
        )
        db.add(notif)
    
    db.commit()
    return {"message": "Credit request rejected"}

@router.post("/credit-requests/{request_id}/push-to-abc")
def push_to_abc(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Simulates pushing approved credits to the Academic Bank of Credits (ABC) system.
    """
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Only institutes can push credits to ABC")
    
    credit_request = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
    if not credit_request:
        raise HTTPException(status_code=404, detail="Credit request not found")
        
    if credit_request.status != "approved":
        raise HTTPException(status_code=400, detail="Only approved credits can be pushed to ABC")

    student = db.query(StudentProfile).join(User, StudentProfile.user_id == User.id).filter(StudentProfile.id == credit_request.student_id).first()
    if not student or not student.user.apaar_id:
        raise HTTPException(status_code=400, detail="Student must have a verified APAAR ID (ABC ID) to push credits")

    # Simulation of external API call to ABC
    # In a real scenario, this would be an authenticated POST request to the ABC portal
    abc_simulation_details = {
        "abc_id": student.user.apaar_id,
        "credits": credit_request.credits_calculated,
        "course_code": "INTERN-" + str(credit_request.application_id),
        "institution_id": current_user.id,
        "timestamp": datetime.now().isoformat()
    }

    # Actual update to database to mark as pushed
    credit_request.is_pushed_to_abc = True
    
    # Log action
    audit = AuditLog(
        action="credit_pushed_to_abc",
        performed_by_id=current_user.id,
        target_type="credit_request",
        target_id=request_id,
        details=f"Pushed {credit_request.credits_calculated} credits to ABC for APAAR ID {student.user.apaar_id}"
    )
    db.add(audit)
    db.commit()

    return {
        "message": "Credits successfully pushed to ABC simulator",
        "abc_response": abc_simulation_details
    }

@router.get("/dashboard/stats")
def get_institute_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Access denied")

    institute = db.query(InstituteProfile).filter(InstituteProfile.user_id == current_user.id).first()
    if not institute:
        raise HTTPException(status_code=404, detail="Institute profile not found")

    # Get student IDs for this institute
    institute_email_domain = current_user.email.split('@')[-1] if current_user.email else None
    student_ids = [s.id for s in db.query(StudentProfile.id).join(User, StudentProfile.user_id == User.id).filter(
        (StudentProfile.institute_id == institute.id) | 
        (StudentProfile.university_name.ilike(f"%{institute.institute_name}%")) |
        (User.email.ilike(f"%@{institute_email_domain}%") if institute_email_domain else False)
    ).all()]

    if not student_ids:
        return {
            "total_students": 0,
            "active_internships": 0,
            "completed_internships": 0,
            "total_credits_approved": 0,
            "pending_credit_requests": 0
        }

    active_internships = db.query(Application).filter(
        Application.student_id.in_(student_ids),
        Application.status.in_(["accepted", "active"])
    ).count()

    completed_internships = db.query(Application).filter(
        Application.student_id.in_(student_ids),
        Application.status == "completed"
    ).count()

    total_credits = db.query(func.sum(CreditRequest.credits_calculated)).filter(
        CreditRequest.student_id.in_(student_ids),
        CreditRequest.status == "approved"
    ).scalar() or 0

    ugc_credits = db.query(func.sum(CreditRequest.credits_calculated)).filter(
        CreditRequest.student_id.in_(student_ids),
        CreditRequest.status == "approved",
        CreditRequest.policy_type == "UGC"
    ).scalar() or 0

    aicte_credits = db.query(func.sum(CreditRequest.credits_calculated)).filter(
        CreditRequest.student_id.in_(student_ids),
        CreditRequest.status == "approved",
        CreditRequest.policy_type == "AICTE"
    ).scalar() or 0

    pending_requests = db.query(CreditRequest).filter(
        CreditRequest.student_id.in_(student_ids),
        CreditRequest.status == "pending"
    ).count()

    return {
        "total_students": len(student_ids),
        "active_internships": active_internships,
        "completed_internships": completed_internships,
        "total_credits_approved": round(total_credits, 2),
        "pending_credit_requests": pending_requests,
        "policy_distribution": {
            "UGC": round(ugc_credits, 2),
            "AICTE": round(aicte_credits, 2)
        }
    }

@router.post("/credit-requests/{request_id}/mark-exception")
def mark_exception(
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
    
    application = db.query(Application).filter(Application.id == credit_request.application_id).first()
    if application:
        application.status = "exception"
        application.rejection_reason = reason
        
    audit = AuditLog(
        action="credit_request_exception",
        performed_by_id=current_user.id,
        target_type="credit_request",
        target_id=request_id,
        details=f"Marked as exception: {reason}"
    )
    db.add(audit)
    db.commit()
    
    return {"message": "Credit request marked as exception"}

@router.get("/export/csv")
def export_credits_csv(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    institute = db.query(InstituteProfile).filter(InstituteProfile.user_id == current_user.id).first()
    institute_email_domain = current_user.email.split('@')[-1] if current_user.email else None
    
    # Get all approved credits for this institute
    credits = db.query(CreditRequest).join(StudentProfile).join(User, StudentProfile.user_id == User.id).filter(
        (StudentProfile.institute_id == institute.id) | 
        (StudentProfile.university_name.ilike(f"%{institute.institute_name}%")) |
        (User.email.ilike(f"%@{institute_email_domain}%") if institute_email_domain else False),
        CreditRequest.status == "approved"
    ).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Student Name', 'Email', 'APAAR ID', 'Hours', 'Policy', 'Credits', 'Approved Date'])
    
    for c in credits:
        student = db.query(StudentProfile).filter(StudentProfile.id == c.student_id).first()
        user = db.query(User).filter(User.id == student.user_id).first() if student else None
        
        student_name = "N/A"
        if user and user.full_name:
            student_name = user.full_name
        elif student:
            student_name = f"{student.first_name} {student.last_name}" if student.first_name else "Student"
            
        writer.writerow([
            student_name,
            user.email if user else "N/A",
            user.apaar_id if user else "N/A",
            c.hours,
            c.policy_type,
            c.credits_calculated,
            c.created_at.strftime("%Y-%m-%d") if c.created_at else "N/A"
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": f"attachment; filename=credits_report_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@router.get("/audit-logs")
def get_audit_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    logs = db.query(AuditLog).filter(
        AuditLog.performed_by_id == current_user.id
    ).order_by(AuditLog.timestamp.desc()).all()
    
    return logs

@router.get("/export/pdf")
def export_credits_pdf(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    institute = db.query(InstituteProfile).filter(InstituteProfile.user_id == current_user.id).first()
    institute_email_domain = current_user.email.split('@')[-1] if current_user.email else None
    
    # Get all approved credits for this institute
    credits = db.query(CreditRequest).join(StudentProfile).join(User, StudentProfile.user_id == User.id).filter(
        (StudentProfile.institute_id == institute.id) | 
        (StudentProfile.university_name.ilike(f"%{institute.institute_name}%")) |
        (User.email.ilike(f"%@{institute_email_domain}%") if institute_email_domain else False),
        CreditRequest.status == "approved"
    ).all()
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    elements.append(Paragraph(f"Credit Approval Report - {institute.institute_name}", styles['Title']))
    elements.append(Spacer(1, 12))
    
    data = [['Student', 'Email', 'Hours', 'Policy', 'Credits']]
    for c in credits:
        student = db.query(StudentProfile).filter(StudentProfile.id == c.student_id).first()
        user = db.query(User).filter(User.id == student.user_id).first() if student else None
        
        student_name = "N/A"
        if user and user.full_name:
            student_name = user.full_name
        elif student:
            student_name = f"{student.first_name} {student.last_name}" if student.first_name else "Student"
            
        data.append([
            student_name,
            user.email if user else "N/A",
            str(c.hours),
            c.policy_type,
            str(c.credits_calculated)
        ])
        
    table = Table(data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 24))
    
    # Disclaimer
    disclaimer_style = styles['Italic']
    disclaimer_style.textColor = colors.red
    elements.append(Paragraph("Note: Credits awarded based on provisional hours. Final certificate verification pending.", disclaimer_style))
    
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f"attachment; filename=credits_report_{datetime.now().strftime('%Y%m%d')}.pdf"}
    )
