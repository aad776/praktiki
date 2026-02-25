from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import List
import csv
import io
from backend.database import get_db
from backend.models.user import User
from backend.models.credit import CreditRequest, CreditStatus
from backend.schemas.credit import CreditRequestResponse
from backend.core.security import get_current_user
from backend.services.audit import create_audit_log
from backend.services.analytics_service import institute_dashboard, get_institute_name
from backend.models.internship import Internship, Application, ApplicationStatus
from backend.schemas.internship import ApplicationResponse

from backend.models.notification import Notification

try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

router = APIRouter(prefix="/institute", tags=["Institute"])

@router.get("/export/csv")
def export_institute_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        with open("debug_export.log", "a") as f:
            f.write("DEBUG: Starting export_institute_csv\n")
        
        if current_user.role != "institute":
            raise HTTPException(status_code=403, detail="Not authorized")
        
        institute_name = get_institute_name(db, current_user)
        if not institute_name:
            raise HTTPException(status_code=404, detail="Institute profile not found")

        from backend.models.user import StudentProfile
        apps = db.query(Application).join(StudentProfile, Application.student_id == StudentProfile.id)\
                 .options(
                     joinedload(Application.internship).joinedload(Internship.employer),
                     joinedload(Application.student).joinedload(StudentProfile.user)
                 )\
                 .filter(StudentProfile.university_name.ilike(f"%{institute_name}%"))\
                 .all()
        
        with open("debug_export.log", "a") as f:
            f.write(f"DEBUG: Found {len(apps)} applications\n")

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Student Name', 'Email', 'APAAR ID', 'Internship', 'Company', 'Hours', 'Credits', 'Policy', 'Status'])
        
        for i, app in enumerate(apps):
            with open("debug_export.log", "a") as f:
                f.write(f"DEBUG: Processing app {i}, student_id={app.student_id}\n")
            try:
                # Debug the object structure
                student = app.student
                with open("debug_export.log", "a") as f:
                    f.write(f"DEBUG: app.student type: {type(student)}\n")
                if student:
                    with open("debug_export.log", "a") as f:
                        f.write(f"DEBUG: student attributes: {dir(student)}\n")
                    user = student.user
                    with open("debug_export.log", "a") as f:
                        f.write(f"DEBUG: student.user type: {type(user)}\n")
                    if user:
                        with open("debug_export.log", "a") as f:
                            f.write(f"DEBUG: user.full_name: {user.full_name}\n")
                
                student_name = app.student.user.full_name if (app.student and app.student.user) else "Unknown"
            except Exception as e:
                with open("debug_export.log", "a") as f:
                    f.write(f"DEBUG: Error accessing user.full_name for app {app.id}: {e}\n")
                    import traceback
                    f.write(traceback.format_exc() + "\n")
                student_name = "Error"
            
            email = app.student.user.email if (app.student and app.student.user) else "Unknown"
            apaar = app.student.apaar_id if app.student else "-"
            internship_title = app.internship.title if app.internship else "Unknown"
            company = app.internship.company_name if app.internship else "Unknown"
            
            writer.writerow([
                student_name,
                email,
                apaar,
                internship_title,
                company,
                app.hours_worked or 0,
                app.credits_awarded or 0,
                app.policy_used or "-",
                app.status
            ])
        
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=credits_report.csv"}
        )
    except Exception as e:
        print(f"CRITICAL ERROR in export_institute_csv: {e}")
        import traceback
        traceback.print_exc()
        raise e

@router.get("/export/pdf")
def export_institute_pdf(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if not REPORTLAB_AVAILABLE:
        raise HTTPException(status_code=501, detail="PDF generation not available (reportlab missing)")
    
    institute_name = get_institute_name(db, current_user)
    if not institute_name:
        raise HTTPException(status_code=404, detail="Institute profile not found")

    from backend.models.user import StudentProfile
    apps = db.query(Application).join(StudentProfile, Application.student_id == StudentProfile.id)\
             .options(
                 joinedload(Application.internship).joinedload(Internship.employer),
                 joinedload(Application.student).joinedload(StudentProfile.user)
             )\
             .filter(StudentProfile.university_name.ilike(f"%{institute_name}%"))\
             .all()

    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    y = height - 50
    
    p.setFont("Helvetica-Bold", 16)
    p.drawString(50, y, f"Credits Report - {institute_name}")
    y -= 30
    
    p.setFont("Helvetica-Bold", 10)
    p.drawString(50, y, "Student")
    p.drawString(200, y, "Internship")
    p.drawString(350, y, "Company")
    p.drawString(450, y, "Credits")
    p.drawString(500, y, "Status")
    y -= 20
    p.line(50, y+15, 550, y+15)
    
    p.setFont("Helvetica", 10)
    for app in apps:
        if y < 50:
            p.showPage()
            y = height - 50
            p.setFont("Helvetica-Bold", 10)
            p.drawString(50, y, "Student")
            p.drawString(200, y, "Internship")
            p.drawString(350, y, "Company")
            p.drawString(450, y, "Credits")
            p.drawString(500, y, "Status")
            y -= 20
            p.setFont("Helvetica", 10)

        student_name = (app.student.user.full_name if (app.student and app.student.user) else "Unknown")[:25]
        internship_title = (app.internship.title if app.internship else "Unknown")[:25]
        company = (app.internship.company_name if app.internship else "Unknown")[:15]
        credits_val = str(app.credits_awarded or 0)
        status = app.status[:10]
        
        p.drawString(50, y, student_name)
        p.drawString(200, y, internship_title)
        p.drawString(350, y, company)
        p.drawString(450, y, credits_val)
        p.drawString(500, y, status)
        y -= 20
        
    p.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=credits_report.pdf"}
    )

@router.get("/dashboard")
def institute_dashboard_api(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    return institute_dashboard(db, user=current_user)

@router.get("/applications/pending-review")
def get_pending_reviews(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    institute_name = get_institute_name(db, current_user)
    if not institute_name:
        return []

    from backend.models.user import StudentProfile
    # Join with StudentProfile and filter
    # Assuming pending reviews might correspond to some status, but for now returning empty list 
    # or filtering by status if we had a "pending_abc_review" status.
    # Since receive_credits sets status="approved", this might be empty unless we change that logic.
    # But to prevent 404, we return list.
    
    # If we want to show something, we can filter by status="completed" which might mean "ready for review" in some context?
    # But user said "approved" in main portal -> "push to abc".
    # So maybe they are already approved.
    
    # Let's return empty list for now to satisfy the frontend call.
    return []

@router.get("/applications", response_model=List[ApplicationResponse])
def get_institute_applications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    institute_name = get_institute_name(db, current_user)
    if not institute_name:
        return []

    from backend.models.user import StudentProfile
    apps = db.query(Application).join(StudentProfile, Application.student_id == StudentProfile.id)\
             .options(
                 joinedload(Application.internship).joinedload(Internship.employer),
                 joinedload(Application.student).joinedload(StudentProfile.user)
             )\
             .filter(StudentProfile.university_name.ilike(f"%{institute_name}%"))\
             .all()
    
    return apps

@router.get("/credits", response_model=List[CreditRequestResponse])
def get_institute_credits(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    institute_name = get_institute_name(db, current_user)
    if not institute_name:
        return []

    from backend.models.user import StudentProfile
    credits = db.query(CreditRequest).join(StudentProfile, CreditRequest.student_id == StudentProfile.id)\
                .filter(StudentProfile.university_name.ilike(f"%{institute_name}%"))\
                .all()
    
    return credits

@router.post("/credit/{request_id}/approve")
def approve_credit_request(request_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    req = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Credit request not found")
        
    req.status = "approved"
    
    # Add notification for student
    from backend.models.user import StudentProfile
    student = db.query(StudentProfile).filter(StudentProfile.id == req.student_id).first()
    if student:
        notif = Notification(
            user_id=student.user_id,
            message=f"Your credit request for an internship has been approved by the institute."
        )
        db.add(notif)
        
    db.commit()
    
    create_audit_log(db, "APPROVE_CREDIT", current_user.id, f"Approved credit request {request_id}")
    return {"message": "Credit request approved"}

@router.post("/credit/{request_id}/reject")
def reject_credit_request(request_id: int, reason: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    req = db.query(CreditRequest).filter(CreditRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Credit request not found")
        
    req.status = "rejected"
    # Optionally store reason in a field if added to model
    
    # Add notification for student
    from backend.models.user import StudentProfile
    student = db.query(StudentProfile).filter(StudentProfile.id == req.student_id).first()
    if student:
        notif = Notification(
            user_id=student.user_id,
            message=f"Your credit request for an internship has been rejected by the institute. Reason: {reason}"
        )
        db.add(notif)

    db.commit()
    
    create_audit_log(db, "REJECT_CREDIT", current_user.id, f"Rejected credit request {request_id}: {reason}")
    return {"message": "Credit request rejected"}

from pydantic import BaseModel
from typing import Optional
from backend.models.user import StudentProfile, EmployerProfile
from backend.models.internship import InternshipPolicy

class ReceiveCreditsRequest(BaseModel):
    student_name: str
    student_email: str
    student_apaar_id: Optional[str] = None
    institute_name: str
    
    internship_title: str
    company_name: str
    
    hours_worked: int
    credits_awarded: float
    policy_used: str
    
    status: str = "approved"

@router.post("/receive-credits")
def receive_credits(data: ReceiveCreditsRequest, db: Session = Depends(get_db)):
    print(f"DEBUG: Received credits for {data.student_email} from {data.institute_name}")
    try:
        # 1. Find or Create Student
        student_user = db.query(User).filter(User.email == data.student_email).first()
        print(f"DEBUG: Student user found: {student_user}")
        if not student_user:
            # Create minimal user
            print("DEBUG: Creating new student user")
            student_user = User(
                email=data.student_email,
                hashed_password="hashed_password_placeholder", # Placeholder
                full_name=data.student_name,
                role="student",
                is_email_verified=True,
                apaar_id=data.student_apaar_id
            )
            db.add(student_user)
            db.flush() # get ID
            
            student_profile = StudentProfile(
                user_id=student_user.id,
                university_name=data.institute_name,
                apaar_id=data.student_apaar_id,
                first_name=data.student_name.split(" ")[0],
                last_name=" ".join(data.student_name.split(" ")[1:]) if " " in data.student_name else ""
            )
            db.add(student_profile)
            db.flush()
        else:
            print("DEBUG: Existing student user found")
            student_profile = student_user.student_profile
            if not student_profile:
                 print("DEBUG: Creating student profile for existing user")
                 student_profile = StudentProfile(
                    user_id=student_user.id,
                    university_name=data.institute_name,
                    apaar_id=data.student_apaar_id
                )
                 db.add(student_profile)
                 db.flush()
    
        # 2. Find or Create Employer
        print(f"DEBUG: Finding employer for {data.company_name}")
        employer_user = db.query(User).join(EmployerProfile).filter(EmployerProfile.company_name == data.company_name).first()
        print(f"DEBUG: Employer user found: {employer_user}")
        
        if employer_user:
             employer_profile = employer_user.employer_profile
        else:
            # Check if user exists by email pattern? Or just create new
            emp_email = f"contact@{data.company_name.lower().replace(' ', '')}.com"
            employer_user = db.query(User).filter(User.email == emp_email).first()
            
            if not employer_user:
                print(f"DEBUG: Creating new employer user with email {emp_email}")
                employer_user = User(
                    email=emp_email,
                    hashed_password="hashed_password_placeholder",
                    full_name=data.company_name,
                    role="employer",
                    is_email_verified=True
                )
                db.add(employer_user)
                db.flush()
            
            # Check if profile exists for this user
            if employer_user.employer_profile:
                 employer_profile = employer_user.employer_profile
            else:
                 employer_profile = EmployerProfile(
                    user_id=employer_user.id,
                    company_name=data.company_name
                 )
                 db.add(employer_profile)
                 db.flush()
    
        # 3. Find or Create Internship
        print(f"DEBUG: Finding internship '{data.internship_title}'")
        internship = db.query(Internship).filter(
            Internship.employer_id == employer_profile.id,
            Internship.title == data.internship_title
        ).first()
        
        if not internship:
            print(f"DEBUG: Creating new internship: {data.internship_title}")
            internship = Internship(
                employer_id=employer_profile.id,
                title=data.internship_title,
                description="Imported from Main Portal",
                status="closed",
                policy=data.policy_used,
                location="Remote",
                mode="Remote",
                duration_weeks=0,
                stipend_amount=0,
                deadline="2025-12-31",
                start_date="2025-01-01",
                skills="General",
                openings=1
            )
            db.add(internship)
            db.flush()
            
        # 4. Find or Create Application
        print("DEBUG: Finding application")
        application = db.query(Application).filter(
            Application.student_id == student_profile.id,
            Application.internship_id == internship.id
        ).first()
        
        if not application:
            print("DEBUG: Creating new application")
            application = Application(
                student_id=student_profile.id,
                internship_id=internship.id,
                status="completed",
                hours_worked=data.hours_worked,
                credits_awarded=data.credits_awarded,
                policy_used=data.policy_used
            )
            db.add(application)
            db.flush()
        else:
            # Update existing application
            print("DEBUG: Updating existing application")
            application.status = "completed"
            application.hours_worked = data.hours_worked
            application.credits_awarded = data.credits_awarded
            application.policy_used = data.policy_used
    
        # 5. Create Credit Request
        print("DEBUG: Creating/updating credit request")
        # Check if exists
        credit_req = db.query(CreditRequest).filter(
            CreditRequest.student_id == student_profile.id,
            CreditRequest.application_id == application.id
        ).first()
        
        if not credit_req:
            credit_req = CreditRequest(
                student_id=student_profile.id,
                application_id=application.id,
                hours=data.hours_worked,
                credits_calculated=data.credits_awarded,
                policy_type=data.policy_used,
                status=data.status,
                is_pushed_to_abc=True
            )
            db.add(credit_req)
        else:
            credit_req.status = data.status
            credit_req.hours = data.hours_worked
            credit_req.credits_calculated = data.credits_awarded
            credit_req.is_pushed_to_abc = True
            
        db.commit()
        print("DEBUG: Transaction committed")
        
        return {"message": "Credits received successfully", "credit_id": credit_req.id}
    except Exception as e:
        print(f"ERROR in receive_credits: {str(e)}")
        import traceback
        with open("abc_error.log", "w") as f:
            f.write(f"Error: {str(e)}\n")
            f.write(traceback.format_exc())
        traceback.print_exc()
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
