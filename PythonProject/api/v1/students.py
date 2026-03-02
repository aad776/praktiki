from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from db.session import get_db
from models.user import User
from models.student_profile import StudentProfile, StudentResume, StudentResumeHistory
from models.credit import CreditRequest
from schemas.students import (
    StudentProfileUpdate, StudentProfileOut, SkillCreate, SkillOut, 
    ApplicationCreate, ApplicationOut, RecommendedInternship, FeedbackAction,
    StudentResumeCreate, StudentResumeUpdate, StudentResumeOut,
    ResumeSuggestionRequest, ResumeSuggestionResponse, ResumeParseResponse
)
from utils.dependencies import get_current_user
from models.skill import Skill
from models.student_skills import StudentSkill
from typing import List, Optional
from models.application import Application
from services.ai_service import ai_service
from services.cv_parser import cv_parser
from services.skill_extractor import SkillExtractor
from models.internship_skills import InternshipSkill
from models.employer_profile import EmployerProfile
from models.internship import Internship
from schemas.employer import InternshipOut

from sqlalchemy import func, desc
from models.notification import Notification
from datetime import datetime

router = APIRouter()

@router.get("/internships", response_model=List[InternshipOut])
def get_all_internships(
    search: Optional[str] = None,
    location: Optional[str] = None,
    mode: Optional[str] = None,
    limit: int = 20,
    skip: int = 0,
    db: Session = Depends(get_db)
):
    """
    Get all active internships with optional filtering.
    """
    query = db.query(Internship).filter(Internship.status == "active")
    
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Internship.title.ilike(search_term)) | 
            (Internship.description.ilike(search_term)) |
            (Internship.skills.ilike(search_term))
        )
        
    if location:
        query = query.filter(Internship.location.ilike(f"%{location}%"))
        
    if mode:
        query = query.filter(Internship.mode == mode)
        
    # Join with EmployerProfile to get company name and logo
    # This requires InternshipOut to have company_name and logo_url fields
    # which it does in schemas/employer.py
    
    internships = query.order_by(desc(Internship.created_at)).offset(skip).limit(limit).all()
    
    # Enrich with employer data
    results = []
    for internship in internships:
        employer = db.query(EmployerProfile).filter(EmployerProfile.id == internship.employer_id).first()
        
        logo_url = employer.logo_url if employer else None
        if logo_url and ("via.placeholder.com" in logo_url or "example.com" in logo_url):
            logo_url = f"https://ui-avatars.com/api/?name={employer.company_name}&background=random"

        # Create a copy/dict to modify
        intern_dict = {
            "id": internship.id,
            "employer_id": internship.employer_id,
            "title": internship.title,
            "description": internship.description,
            "location": internship.location,
            "mode": internship.mode,
            "duration_weeks": internship.duration_weeks,
            "deadline": internship.deadline,
            "skills": internship.skills,
            "policy": internship.policy,
            "stipend_amount": internship.stipend_amount,
            "created_at": internship.created_at,
            "company_name": employer.company_name if employer else "Unknown Company",
            "logo_url": logo_url
        }
        results.append(InternshipOut(**intern_dict))
        
    return results


@router.get("/internships/metadata")
def get_internship_metadata(
    db: Session = Depends(get_db)
):
    """
    Get dynamic metadata for Internship Mega Menu
    - Top Locations (by job count)
    - Top Profiles (by title count)
    """
    # Top Locations
    top_locations_query = db.query(
        Internship.location, func.count(Internship.id).label('count')
    ).group_by(Internship.location).order_by(desc('count')).limit(10).all()
    
    top_locations = [loc[0] for loc in top_locations_query if loc[0]]

    # Top Profiles (Titles)
    top_profiles_query = db.query(
        Internship.title, func.count(Internship.id).label('count')
    ).group_by(Internship.title).order_by(desc('count')).limit(10).all()
    
    top_profiles = [prof[0] for prof in top_profiles_query if prof[0]]

    return {
        "top_locations": top_locations,
        "top_profiles": top_profiles
    }


@router.get("/internships/{internship_id}", response_model=InternshipOut)
def get_internship_detail(
    internship_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific internship.
    """
    internship = db.query(Internship).filter(Internship.id == internship_id).first()
    if not internship:
        raise HTTPException(status_code=404, detail="Internship not found")
        
    employer = db.query(EmployerProfile).filter(EmployerProfile.id == internship.employer_id).first()
    
    logo_url = employer.logo_url if employer else None
    if logo_url and ("via.placeholder.com" in logo_url or "example.com" in logo_url):
        logo_url = f"https://ui-avatars.com/api/?name={employer.company_name}&background=random"
    
    intern_dict = {
        "id": internship.id,
        "employer_id": internship.employer_id,
        "title": internship.title,
        "description": internship.description,
        "location": internship.location,
        "mode": internship.mode,
        "duration_weeks": internship.duration_weeks,
        "deadline": internship.deadline,
        "skills": internship.skills,
        "policy": internship.policy,
        "stipend_amount": internship.stipend_amount,
        "created_at": internship.created_at,
        "company_name": employer.company_name if employer else "Unknown Company",
        "logo_url": logo_url
    }
    
    return InternshipOut(**intern_dict)

@router.get("/me", response_model=StudentProfileOut)
def get_my_profile(
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not a student account")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        # Auto-create profile if missing (fallback for old users)
        profile = StudentProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    profile.email = current_user.email
    # Set full_name for the response schema
    profile.full_name = current_user.full_name
    
    # Map fields from current_user to profile object for Pydantic schema
    profile.apaar_id = current_user.apaar_id
    profile.is_apaar_verified = bool(current_user.is_apaar_verified)
    profile.phone_number = current_user.phone_number
    
    # Ensure mandatory boolean fields are not None
    if profile.is_apaar_verified is None:
        profile.is_apaar_verified = False
        
    # Fix broken placeholder profile picture URL
    if hasattr(profile, 'resume') and profile.resume and profile.resume.profile_picture:
        if "via.placeholder.com" in profile.resume.profile_picture:
            profile.resume.profile_picture = f"https://api.dicebear.com/7.x/avataaars/svg?seed={current_user.full_name or 'student'}"
    
    return profile

@router.post("/me", response_model=StudentProfileOut)
def create_my_profile(
        profile_data: StudentProfileUpdate,
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can create profile")

    # Check if profile already exists
    existing_profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if existing_profile:
        # Update existing profile
        for key, value in profile_data.dict(exclude_unset=True).items():
            setattr(existing_profile, key, value)
        
        # Also update User table if needed
        if profile_data.apaar_id:
            current_user.apaar_id = profile_data.apaar_id
            current_user.is_apaar_verified = False # Reset verification on change
        
        if profile_data.phone_number:
            current_user.phone_number = profile_data.phone_number
            
        if profile_data.first_name or profile_data.last_name:
            # Update full_name
            full_name = f"{profile_data.first_name or ''} {profile_data.last_name or ''}".strip()
            if full_name:
                current_user.full_name = full_name
        
        db.commit()
        db.refresh(existing_profile)
        
        existing_profile.email = current_user.email
        existing_profile.full_name = current_user.full_name
        existing_profile.apaar_id = current_user.apaar_id
        existing_profile.is_apaar_verified = bool(current_user.is_apaar_verified)
        existing_profile.phone_number = current_user.phone_number
        
        return existing_profile

    # Create new profile
    new_profile = StudentProfile(
        user_id=current_user.id,
        **profile_data.dict(exclude_unset=True)
    )
    
    # Also update User table if needed
    if profile_data.apaar_id:
        current_user.apaar_id = profile_data.apaar_id
    
    if profile_data.phone_number:
        current_user.phone_number = profile_data.phone_number

    if profile_data.first_name or profile_data.last_name:
        full_name = f"{profile_data.first_name or ''} {profile_data.last_name or ''}".strip()
        if full_name:
            current_user.full_name = full_name
            
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)
    
    new_profile.email = current_user.email
    new_profile.full_name = current_user.full_name
    new_profile.apaar_id = current_user.apaar_id
    new_profile.is_apaar_verified = bool(current_user.is_apaar_verified)
    new_profile.phone_number = current_user.phone_number
    
    return new_profile

@router.put("/me", response_model=StudentProfileOut)
def update_my_profile(
    profile_data: StudentProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return create_my_profile(profile_data, current_user, db)

@router.get("/my-applications", response_model=List[ApplicationOut])
def get_my_applications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not a student")
        
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        return []
        
    applications = db.query(Application).filter(Application.student_id == profile.id)\
        .options(
            joinedload(Application.internship).joinedload(Internship.employer),
            joinedload(Application.credit_request)
        ).all()
    
    results = []
    for app in applications:
        # Construct InternshipOut
        internship_data = None
        if app.internship:
            employer = app.internship.employer
            internship_data = InternshipOut(
                id=app.internship.id,
                employer_id=app.internship.employer_id,
                title=app.internship.title,
                description=app.internship.description,
                location=app.internship.location,
                mode=app.internship.mode,
                duration_weeks=app.internship.duration_weeks,
                deadline=app.internship.deadline,
                skills=app.internship.skills,
                policy=app.internship.policy,
                created_at=app.internship.created_at,
                company_name=employer.company_name if employer else "Unknown Company",
                logo_url=employer.logo_url if employer else None
            )
            
        # Check credit request
        is_credit_requested = False
        credit_status = None
        is_pushed_to_abc = False
        if hasattr(app, 'credit_request') and app.credit_request:
            is_credit_requested = True
            # Handle both list (default backref) and single object (uselist=False)
            if isinstance(app.credit_request, list):
                if len(app.credit_request) > 0:
                    # Take the latest request if multiple exist
                    latest_req = app.credit_request[-1] 
                    credit_status = latest_req.status
                    is_pushed_to_abc = latest_req.is_pushed_to_abc
            else:
                credit_status = app.credit_request.status
                is_pushed_to_abc = app.credit_request.is_pushed_to_abc
            
        results.append(ApplicationOut(
            id=app.id,
            internship_id=app.internship_id,
            status=app.status,
            applied_at=app.applied_at,
            internship=internship_data,
            is_credit_requested=is_credit_requested,
            credit_status=credit_status,
            is_pushed_to_abc=is_pushed_to_abc,
            hours_worked=app.hours_worked,
            policy_used=app.policy_used,
            credits_awarded=app.credits_awarded
        ))
        
    return results

@router.post("/apply", response_model=ApplicationOut)
def apply_for_internship(
    application_data: ApplicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not a student")
        
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found. Please complete your profile first.")
        
    # Check if already applied
    existing = db.query(Application).filter(
        Application.student_id == profile.id,
        Application.internship_id == application_data.internship_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already applied to this internship")
        
    new_app = Application(
        student_id=profile.id,
        internship_id=application_data.internship_id,
        status="applied",
        applied_at=datetime.utcnow()
    )
    
    db.add(new_app)
    db.commit()
    db.refresh(new_app)
    
    # Create notification for employer
    internship = db.query(Internship).filter(Internship.id == application_data.internship_id).first()
    if internship:
        employer = db.query(EmployerProfile).filter(EmployerProfile.id == internship.employer_id).first()
        if employer:
            notification = Notification(
                user_id=employer.user_id,
                message=f"Student {current_user.full_name} has applied for {internship.title}"
            )
            db.add(notification)
            db.commit()
    
    return new_app

from services.ai_service import ai_service

@router.get("/recommendations", response_model=List[RecommendedInternship])
def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not a student")
        
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    try:
        recommendations = ai_service.get_recommendations(db, profile)
        return recommendations
    except Exception as e:
        print(f"Error getting recommendations: {e}")
        # Fallback to recent active internships if AI fails
        internships = db.query(Internship).filter(Internship.status == "active").order_by(Internship.created_at.desc()).limit(5).all()
        fallback_recs = []
        for intern in internships:
            fallback_recs.append(RecommendedInternship(
                internship_id=intern.id,
                title=intern.title,
                company_name=intern.employer.company_name if intern.employer else "Unknown",
                match_score=50, # Default score
                matching_skills=[],
                missing_skills=[],
                explanation={"message": "Fallback recommendation based on recent activity"},
                status="active"
            ))
        return fallback_recs

@router.get("/me/skills", response_model=List[SkillOut])
def get_my_skills(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not a student")
        
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        return []
        
    # Parse skills from comma separated string
    if not profile.skills:
        return []
        
    skill_names = [s.strip() for s in profile.skills.split(",") if s.strip()]
    return [SkillOut(id=i, name=name) for i, name in enumerate(skill_names)]

@router.post("/me/skills", response_model=SkillOut)
def add_skill(
    skill: SkillCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not a student")
        
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    current_skills = [s.strip() for s in (profile.skills or "").split(",") if s.strip()]
    if skill.name not in current_skills:
        current_skills.append(skill.name)
        profile.skills = ",".join(current_skills)
        db.commit()
        
    return SkillOut(id=len(current_skills), name=skill.name)

@router.post("/me/resume/suggestions", response_model=ResumeSuggestionResponse)
def get_resume_suggestions(
    request: ResumeSuggestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate AI-powered suggestions for resume sections based on student profile.
    """
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this feature")

    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        # Create minimal profile if missing
        profile = StudentProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    suggestions = []

    # Prefer context from request if available, else fall back to profile
    course = request.context.get("course") if request.context and request.context.get("course") else (profile.degree or "Engineering")
    stream = request.context.get("stream") if request.context and request.context.get("stream") else (profile.department or "Computer Science")
    
    # Skills from context or profile
    if request.context and request.context.get("skills"):
        skills = [s.strip() for s in request.context.get("skills").split(",") if s.strip()]
    else:
        skills = [s.strip() for s in (profile.skills or "").split(",") if s.strip()]

    # Enhanced AI Logic with Context-Aware Suggestions
    stream_lower = stream.lower()
    
    # define context data
    context = {
        "stream": stream,
        "course": course,
        "skills": ", ".join(skills[:3]) if skills else "technical skills",
        "top_skill": skills[0] if skills else "problem solving"
    }

    if request.section == "career_objective":
        if "computer" in stream_lower or "cse" in stream_lower or "it" in stream_lower:
            suggestions = [
                f"Aspiring {stream} engineer with a strong foundation in {context['skills']}. Seeking an entry-level position to apply technical skills in software development and contribute to innovative solutions.",
                f"Motivated {course} undergraduate specializing in {stream}. Eager to leverage proficiency in {context['skills']} to solve complex problems and drive organizational growth.",
                f"Passionate developer looking for a challenging role in {stream} domain. Committed to utilizing skills in {context['skills']} to build scalable and efficient applications."
            ]
        elif "mechanical" in stream_lower:
             suggestions = [
                f"Mechanical Engineering student with expertise in {context['skills']}. Seeking a role in design and manufacturing to apply theoretical knowledge and practical skills.",
                f"Innovative {stream} major with a passion for thermodynamics and mechanics. Looking to contribute to R&D projects utilizing {context['skills']}.",
                f"Dedicated {course} student aiming to leverage skills in {context['skills']} for optimizing mechanical systems and processes."
            ]
        elif "civil" in stream_lower:
             suggestions = [
                f"Civil Engineering enthusiast with a focus on structural analysis and {context['skills']}. Seeking an opportunity to contribute to infrastructure development projects.",
                f"Detail-oriented {stream} student skilled in {context['skills']}. Eager to apply knowledge of construction management and design in a professional setting.",
                f"Aspiring Civil Engineer looking to utilize skills in {context['skills']} for sustainable urban planning and development."
            ]
        elif "business" in stream_lower or "management" in stream_lower or "mba" in stream_lower:
             suggestions = [
                f"Business Administration student with a knack for {context['skills']}. Seeking a management trainee role to drive operational efficiency and strategic growth.",
                f"Result-oriented {course} graduate specializing in {stream}. Eager to apply skills in {context['skills']} to solve business challenges.",
                f"Ambitious professional aiming to leverage expertise in {context['skills']} for effective project management and team leadership."
            ]
        else:
            suggestions = [
                f"Aspiring {stream} student with a strong foundation in {context['skills']}. Seeking an entry-level position to apply technical skills and contribute to organizational growth.",
                f"Motivated {course} undergraduate specializing in {stream}. Eager to leverage skills in {context['skills']} to solve real-world problems.",
                f"To secure a challenging role in the field of {stream} where I can utilize my analytical and technical skills for the development of the organization."
            ]
    
    elif request.section == "work_experience":
        if "computer" in stream_lower or "cse" in stream_lower:
            suggestions = [
                f"Software Intern at [Company] | Developed and maintained web applications using {context['top_skill']}, improving user engagement by 20%.",
                f"Full Stack Developer Intern | Collaborated with a team of 4 to build a [Project Type] using {context['skills']}.",
                f"Backend Engineering Intern | Optimized database queries and API endpoints in {context['top_skill']}, reducing latency by 15%."
            ]
        elif "mechanical" in stream_lower:
            suggestions = [
                f"Design Intern at [Company] | Assisted in 3D modeling and simulation of components using {context['top_skill']}.",
                f"Manufacturing Intern | Monitored production lines and suggested process improvements using {context['skills']}.",
                f"R&D Intern | Conducted material testing and analysis to support product development."
            ]
        elif "business" in stream_lower:
            suggestions = [
                f"Marketing Intern | Executed social media campaigns using {context['top_skill']}, increasing brand awareness by 25%.",
                f"Business Analyst Intern | Analyzed market trends and prepared reports using {context['skills']} to support decision-making.",
                f"HR Intern | Assisted in recruitment processes and employee engagement activities."
            ]
        else:
             suggestions = [
                f"Intern at [Company Name] | Developed features using {context['skills']} to improve system efficiency.",
                f"Collaborated with cross-functional teams to design and implement scalable solutions in {stream}.",
                "Assisted in debugging and optimizing code, resulting in a 15% performance improvement."
            ]
        
    elif request.section == "projects":
        if "computer" in stream_lower or "cse" in stream_lower:
            suggestions = [
                f"E-Commerce Platform | Built a scalable online store using {context['skills']} with secure payment gateway integration.",
                f"AI Chatbot | Developed a conversational agent using {context['top_skill']} and NLP libraries to automate customer support.",
                f"Task Management App | Designed a productivity tool with real-time updates using {context['skills']}."
            ]
        elif "mechanical" in stream_lower:
            suggestions = [
                f"Robotic Arm Prototype | Designed and fabricated a 3-DOF robotic arm using {context['skills']}.",
                f"Solar Powered Vehicle | Led a team to build a solar-electric hybrid vehicle, optimizing energy efficiency.",
                f"HVAC System Design | Simulated and analyzed air flow in a commercial building using {context['top_skill']}."
            ]
        else:
            suggestions = [
                f"Built a [Project Name] using {context['skills']} that solved [Problem].",
                f"Designed and implemented a real-time application for [Use Case] utilizing {context['top_skill']}.",
                "Developed a full-stack web application with secure authentication and database integration."
            ]
        
    elif request.section == "skills":
        # Suggest related skills based on stream
        if "computer" in stream_lower or "cse" in stream_lower:
            suggestions = ["Python, Java, C++", "React, Node.js, MongoDB", "AWS, Docker, Kubernetes", "Data Structures & Algorithms", "Git, CI/CD"]
        elif "mechanical" in stream_lower:
            suggestions = ["AutoCAD, SolidWorks", "ANSYS, MATLAB", "Thermodynamics, Fluid Mechanics", "GD&T", "Manufacturing Processes"]
        elif "civil" in stream_lower:
            suggestions = ["AutoCAD, Revit", "STAAD.Pro, Etabs", "Surveying, Structural Analysis", "Construction Management", "Geotechnical Engineering"]
        elif "electronics" in stream_lower or "ece" in stream_lower:
            suggestions = ["Verilog, VHDL", "Embedded C, Microcontrollers", "PCB Design, Eagle", "MATLAB, Simulink", "IoT, Arduino"]
        elif "business" in stream_lower or "mba" in stream_lower:
             suggestions = ["Market Research, SEO", "Financial Analysis, Excel", "Project Management, Agile", "CRM, Salesforce", "Public Speaking, Leadership"]
        else:
            suggestions = ["Communication, Leadership", "Problem Solving, Critical Thinking", "Project Management", "Team Collaboration", "Time Management"]

    return ResumeSuggestionResponse(suggestions=suggestions[:5])

@router.post("/me/resume/parse", response_model=ResumeParseResponse)
async def parse_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Parse an uploaded resume (PDF/DOCX) and extract sections.
    """
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access this feature")

    content = await file.read()
    filename = file.filename
    file_ext = filename.split(".")[-1].lower()
    
    try:
        # Use CVParser to extract raw text
        text = cv_parser.extract_text(content, file_ext)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {str(e)}")
        
    # Extract skills using NLP/Regex
    extractor = SkillExtractor()
    skills_data = extractor.extract_skills_keyword_matching(text)
    skill_names = [s['name'] for s in skills_data]
    
    # Simple heuristic parsing for other sections based on keywords
    # This is a very basic implementation. In a real world scenario, use an LLM.
    
    lines = text.split('\n')
    sections = {
        "education": [],
        "experience": [],
        "projects": [],
        "summary": []
    }
    
    current_section = "summary"
    
    for line in lines:
        line = line.strip()
        if not line: continue
        
        lower_line = line.lower()
        
        # Section headers detection
        if any(keyword in lower_line for keyword in ["education", "academic qualification", "scholastic"]):
            current_section = "education"
            continue
        elif any(keyword in lower_line for keyword in ["experience", "work history", "employment", "internship"]):
            current_section = "experience"
            continue
        elif any(keyword in lower_line for keyword in ["project", "academic projects"]):
            current_section = "projects"
            continue
        elif any(keyword in lower_line for keyword in ["skills", "technical skills", "competencies"]):
            # We already extracted skills separately, but we can capture text too if needed
            current_section = "skills_text" 
            continue
            
        if current_section in sections:
            sections[current_section].append(line)

    # Format into response structure
    education_entries = []
    if sections["education"]:
        # Naive: treat first line as degree/uni
        education_entries.append({
            "degree": "Parsed Education", 
            "university": sections["education"][0] if sections["education"] else "",
            "start_year": "",
            "end_year": ""
        })
        
    experience_entries = []
    if sections["experience"]:
        experience_entries.append({
            "role": "Parsed Experience",
            "company": sections["experience"][0] if sections["experience"] else "",
            "duration": "",
            "description": " ".join(sections["experience"][1:5]) # First few lines
        })
        
    project_entries = []
    if sections["projects"]:
        project_entries.append({
            "title": "Parsed Project",
            "link": "",
            "description": " ".join(sections["projects"][:3])
        })

    return ResumeParseResponse(
        career_objective=" ".join(sections["summary"][:5]), # First few lines as summary
        skills=list(set(skill_names)),
        education=education_entries,
        experience=experience_entries,
        projects=project_entries
    )

@router.get("/me/resume", response_model=StudentResumeOut)
def get_my_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can access resume")
        
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    resume = db.query(StudentResume).filter(StudentResume.student_id == profile.id).first()
    if not resume:
        # Create empty resume if it doesn't exist
        resume = StudentResume(student_id=profile.id)
        db.add(resume)
        db.commit()
        db.refresh(resume)
        
    return resume

@router.put("/me/resume", response_model=StudentResumeOut)
def update_my_resume(
    resume_data: StudentResumeUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Only students can update resume")
        
    profile = db.query(StudentProfile).filter(StudentProfile.user_id == current_user.id).first()
    if not profile:
        # Create minimal profile if missing to allow resume updates
        profile = StudentProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
    resume = db.query(StudentResume).filter(StudentResume.student_id == profile.id).first()
    if not resume:
        # Create new resume if not exists
        resume = StudentResume(student_id=profile.id)
        db.add(resume)
        db.commit()
        db.refresh(resume)
        
    # Update fields
    resume_data_dict = resume_data.dict(exclude_unset=True)
    for key, value in resume_data_dict.items():
        setattr(resume, key, value)
        
    db.commit()
    db.refresh(resume)
    return resume
