from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, extract, desc
from typing import List
import io
import csv
from backend.database import get_db
from backend.models.user import User, UserRole
from backend.models.internship import Application, ApplicationStatus, Internship, InternshipPolicy
from backend.models.credit import CreditRequest, CreditStatus, AuditLog
from backend.schemas.internship import ApplicationResponse, InternshipResponse
from backend.schemas.user import UserResponse
from backend.core.security import get_current_user
from backend.services.audit import create_audit_log

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    total_companies = db.query(User).filter(User.role == UserRole.COMPANY).count()
    total_institutes = db.query(User).filter(User.role == UserRole.INSTITUTE).count()
    total_internships = db.query(Internship).count()
    total_credits_issued = db.query(func.sum(CreditRequest.credits_calculated)).filter(CreditRequest.status == CreditStatus.APPROVED).scalar() or 0
    pending_institute_reviews = db.query(Application).filter(Application.status == ApplicationStatus.INSTITUTE_REVIEW).count()
    
    # Exceptions Count
    exceptions_count = db.query(Application).filter(Application.status == ApplicationStatus.EXCEPTION).count()
    rejected_credits_count = db.query(CreditRequest).filter(CreditRequest.status == CreditStatus.REJECTED).count()

    return {
        "total_students": total_students,
        "total_companies": total_companies,
        "total_institutes": total_institutes,
        "total_internships": total_internships,
        "total_credits_issued": total_credits_issued,
        "pending_institute_reviews": pending_institute_reviews,
        "exceptions_count": exceptions_count,
        "rejected_credits_count": rejected_credits_count
    }

@router.get("/analytics")
def get_admin_analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Policy-wise credit distribution
    policy_stats = db.query(
        CreditRequest.policy_type, 
        func.sum(CreditRequest.credits_calculated)
    ).filter(CreditRequest.status == CreditStatus.APPROVED).group_by(CreditRequest.policy_type).all()
    
    formatted_policy_stats = [{"name": p[0] or 'Unknown', "value": p[1] or 0} for p in policy_stats]

    # Monthly internship trends (Applications created)
    monthly_stats = db.query(
        extract('month', Application.created_at).label('month'),
        func.count(Application.id).label('count')
    ).group_by('month').order_by('month').all()
    
    formatted_monthly_stats = [{"month": int(m[0]), "count": m[1]} for m in monthly_stats if m[0] is not None]

    # Institute-wise activity (Top 5 by approved credits)
    institute_activity = db.query(
        User.institute_name,
        func.sum(CreditRequest.credits_calculated).label('total_credits')
    ).join(User, CreditRequest.student_id == User.id)\
     .filter(CreditRequest.status == CreditStatus.APPROVED)\
     .group_by(User.institute_name)\
     .order_by(desc('total_credits'))\
     .limit(5).all()
     
    formatted_institute_stats = [{"name": i[0] or 'Unknown', "credits": i[1]} for i in institute_activity]

    return {
        "policy_distribution": formatted_policy_stats,
        "monthly_trends": formatted_monthly_stats,
        "institute_activity": formatted_institute_stats
    }

@router.get("/users/{role}", response_model=List[UserResponse])
def get_users_by_role(role: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    valid_roles = [UserRole.STUDENT, UserRole.COMPANY, UserRole.INSTITUTE]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
        
    return db.query(User).filter(User.role == role).all()

@router.get("/applications/all", response_model=List[ApplicationResponse])
def get_all_applications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return db.query(Application).\
        options(joinedload(Application.internship).joinedload(Internship.company), joinedload(Application.student)).\
        all()

@router.get("/internships/all", response_model=List[InternshipResponse])
def get_all_internships(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # We might want to annotate with student count, but for now simple list is fine
    # or we can do it in frontend if we eagerly load applications.
    # InternshipResponse model usually doesn't include application count directly.
    # Let's just return internships and let frontend or another call handle details if needed.
    return db.query(Internship).\
        options(joinedload(Internship.company)).\
        all()

@router.get("/export/system-summary")
def export_system_summary_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # System Stats
    writer.writerow(['--- System Summary ---'])
    stats = get_dashboard_stats(db, current_user)
    for key, value in stats.items():
        writer.writerow([key.replace('_', ' ').title(), value])
    
    writer.writerow([])
    
    # Top Institutes
    writer.writerow(['--- Top Institutes (by Credits) ---'])
    institute_activity = db.query(
        User.institute_name,
        func.sum(CreditRequest.credits_calculated).label('total_credits')
    ).join(User, CreditRequest.student_id == User.id)\
     .filter(CreditRequest.status == CreditStatus.APPROVED)\
     .group_by(User.institute_name)\
     .order_by(desc('total_credits'))\
     .limit(10).all()
     
    writer.writerow(['Institute Name', 'Total Credits Approved'])
    for inst in institute_activity:
        writer.writerow([inst[0], inst[1]])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": "attachment; filename=system_summary.csv"}
    )

@router.get("/export/audit-logs")
def export_audit_logs_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    logs = db.query(AuditLog).order_by(desc(AuditLog.timestamp)).limit(1000).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Timestamp', 'Action', 'Performed By', 'Details'])
    
    for log in logs:
        performed_by = log.performed_by.username if log.performed_by else "Unknown"
        writer.writerow([log.timestamp, log.action, performed_by, log.details])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]), 
        media_type="text/csv", 
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"}
    )

