from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from models.user import User
from models.employer_profile import EmployerProfile
from models.internship import Internship
from schemas.employer import InternshipCreate, InternshipOut, EmployerProfileUpdate, EmployerProfileOut
from utils.dependencies import get_current_user
from typing import List
from models.application import Application
from schemas.employer import ApplicationStatusUpdate

router = APIRouter()

@router.get("/profile", response_model=EmployerProfileOut)
def get_employer_profile(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")
    profile = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Employer profile not found")
    return profile

@router.put("/profile", response_model=EmployerProfileOut)
def update_employer_profile(
        profile_in: EmployerProfileUpdate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")
    profile = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    if not profile:
        profile = EmployerProfile(user_id=current_user.id)
        db.add(profile)
    for var, value in profile_in.dict(exclude_unset=True).items():
        setattr(profile, var, value)
    db.commit()
    db.refresh(profile)
    return profile

@router.post("/internships", response_model=InternshipOut)
def create_internship(
        internship_in: InternshipCreate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    # Security: Sirf Employer hi post kar sakta hai
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Only employers can post internships")

    # 1. Get Employer Profile
    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()

    # 2. Create Internship
    new_internship = Internship(
        employer_id=employer.id,
        title=internship_in.title,
        description=internship_in.description,
        location=internship_in.location,
        mode=internship_in.mode,
        duration_weeks=internship_in.duration_weeks
    )
    db.add(new_internship)
    db.commit()
    db.refresh(new_internship)

    return new_internship


@router.get("/my-internships", response_model=List[InternshipOut])
def get_my_posted_internships(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")

    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    return db.query(Internship).filter(Internship.employer_id == employer.id).all()


@router.get("/internships/{internship_id}/applications")
def view_internship_applications(
        internship_id: int,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")

    # Check if this internship belongs to this employer
    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    internship = db.query(Internship).filter(
        Internship.id == internship_id,
        Internship.employer_id == employer.id
    ).first()

    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found or not yours")

    # Get all applications for this internship
    applications = db.query(Application).filter(Application.internship_id == internship_id).all()
    return applications


@router.put("/applications/{application_id}/status")
def update_application_status(
        application_id: int,
        status_update: ApplicationStatusUpdate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "employer":
        raise HTTPException(status_code=403, detail="Access denied")

    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Check if employer owns the internship of this application
    employer = db.query(EmployerProfile).filter(EmployerProfile.user_id == current_user.id).first()
    internship = db.query(Internship).filter(
        Internship.id == application.internship_id,
        Internship.employer_id == employer.id
    ).first()

    if not internship:
        raise HTTPException(status_code=403, detail="You can't update this application")

    application.status = status_update.status
    db.commit()
    return {"message": f"Application status updated to {status_update.status}"}
