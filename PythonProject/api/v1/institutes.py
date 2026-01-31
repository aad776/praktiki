from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from db.session import get_db
from models.user import User
from models.institute_profile import InstituteProfile
from models.student_profile import StudentProfile
from models.application import Application
from models.internship import Internship
from models.employer_profile import EmployerProfile
from utils.dependencies import get_current_user
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

    # Get all students belonging to this institute
    students = db.query(StudentProfile).filter(StudentProfile.institute_id == institute.id).options(
        joinedload(StudentProfile.applications)
    ).all()

    result = []
    for s in students:
        # Get student's current internships (accepted applications)
        internships = []
        for app in s.applications:
            if app.status == "accepted":
                # Get internship details
                internship = db.query(Internship).filter(Internship.id == app.internship_id).first()
                if internship:
                    # Get company name
                    employer = db.query(EmployerProfile).filter(EmployerProfile.id == internship.employer_id).first()
                    internships.append({
                        "id": internship.id,
                        "title": internship.title,
                        "company_name": employer.company_name if employer else "Unknown Company",
                        "location": internship.location,
                        "mode": internship.mode,
                        "duration_weeks": internship.duration_weeks
                    })

        result.append({
            "id": s.id,
            "name": s.full_name or "Student",
            "department": s.department,
            "year": s.year,
            "apaar_id": s.apaar_id,
            "is_apaar_verified": s.is_apaar_verified,
            "status": "Verified" if s.is_apaar_verified else "Pending",
            "internships": internships,
            "total_internships": len(internships)
        })

    return result
