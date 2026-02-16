from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_
from backend.models.credit import CreditRequest, CreditStatus
from backend.models.internship import Application, ApplicationStatus
from backend.models.user import User
from datetime import datetime

def get_institute_name(db: Session, user: User):
    if user.role != "institute":
        return None
    # Use relationship to get institute_name from profile
    if user.institute_profile:
        return user.institute_profile.institute_name
    return None

def institute_dashboard(db: Session, start_date: str = None, end_date: str = None, policy: str = None, user: User = None):
    institute_name = get_institute_name(db, user)
    
    # Base query for CreditRequest joined with User to filter by institute
    # Need to join with User and then StudentProfile to get institute mapping
    # Actually, StudentProfile has institute_id or university_name
    from backend.models.student_profile import StudentProfile
    
    query = db.query(CreditRequest).join(StudentProfile, CreditRequest.student_id == StudentProfile.id)
    
    if institute_name:
        # Match by institute_id or university_name (similar to main portal logic)
        from backend.models.institute_profile import InstituteProfile
        institute = db.query(InstituteProfile).filter(InstituteProfile.institute_name == institute_name).first()
        if institute:
            query = query.filter(
                (StudentProfile.institute_id == institute.id) | 
                (StudentProfile.university_name.ilike(f"%{institute_name}%"))
            )
        else:
            query = query.filter(StudentProfile.university_name.ilike(f"%{institute_name}%"))

    # Apply date/policy filters for stats
    stats_query = query.filter(
        CreditRequest.status == CreditStatus.APPROVED,
        CreditRequest.is_pushed_to_abc == True
    )
    
    if start_date:
        stats_query = stats_query.filter(CreditRequest.updated_at >= datetime.strptime(start_date, '%Y-%m-%d'))
    if end_date:
        stats_query = stats_query.filter(CreditRequest.updated_at <= datetime.strptime(end_date, '%Y-%m-%d'))
    if policy and policy != 'ALL':
        stats_query = stats_query.filter(CreditRequest.policy_type == policy)
        
    approved_requests = stats_query.all()
    
    # Calculate stats
    total = sum(req.credits_calculated or 0 for req in approved_requests)
    
    # Policy stats
    policy_query = db.query(
        CreditRequest.policy_type, 
        func.count(CreditRequest.id)
    ).join(StudentProfile, CreditRequest.student_id == StudentProfile.id).filter(
        CreditRequest.status == CreditStatus.APPROVED,
        CreditRequest.is_pushed_to_abc == True
    )
    
    if institute_name:
        if institute:
            policy_query = policy_query.filter(
                (StudentProfile.institute_id == institute.id) | 
                (StudentProfile.university_name.ilike(f"%{institute_name}%"))
            )
        else:
            policy_query = policy_query.filter(StudentProfile.university_name.ilike(f"%{institute_name}%"))

    policy_stats = policy_query.group_by(CreditRequest.policy_type).all()
    
    # Active Internships
    active_query = db.query(Application).join(StudentProfile, Application.student_id == StudentProfile.id).filter(
        Application.status.in_(["accepted", "completed"])
    )
    if institute_name:
        if institute:
            active_query = active_query.filter(
                (StudentProfile.institute_id == institute.id) | 
                (StudentProfile.university_name.ilike(f"%{institute_name}%"))
            )
        else:
            active_query = active_query.filter(StudentProfile.university_name.ilike(f"%{institute_name}%"))
    
    active_internships = active_query.count()

    # Rejected count
    rejected_query = db.query(CreditRequest).join(StudentProfile, CreditRequest.student_id == StudentProfile.id).filter(CreditRequest.status == CreditStatus.REJECTED)
    if institute_name:
        if institute:
            rejected_query = rejected_query.filter(
                (StudentProfile.institute_id == institute.id) | 
                (StudentProfile.university_name.ilike(f"%{institute_name}%"))
            )
        else:
            rejected_query = rejected_query.filter(StudentProfile.university_name.ilike(f"%{institute_name}%"))

    return {
        "total_credits": total,
        "approved": len(approved_requests),
        "rejected": rejected_query.count(),
        "active_internships": active_internships,
        "policy_stats": [{"name": p[0], "value": p[1]} for p in policy_stats]
    }
