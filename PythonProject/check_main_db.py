import sys
import os
sys.path.append(os.getcwd())

from db.session import SessionLocal
from models.credit import CreditRequest
from models.internship import Internship
from models.application import Application
from models.user import User
from models.student_profile import StudentProfile
from models.employer_profile import EmployerProfile

db = SessionLocal()

print("--- Credit Requests ---")
requests = db.query(CreditRequest).all()
for req in requests:
    student = db.query(StudentProfile).filter(StudentProfile.id == req.student_id).first()
    student_name = student.user.full_name if student and student.user else "Unknown"
    
    app = db.query(Application).filter(Application.id == req.application_id).first()
    internship_title = "Unknown"
    company_name = "Unknown"
    if app and app.internship:
        internship_title = app.internship.title
        if app.internship.employer:
            company_name = app.internship.employer.company_name

    print(f"ID: {req.id}, Student: {student_name}, Internship: {internship_title}, Company: {company_name}, Status: {req.status}, Pushed: {req.is_pushed_to_abc}")

print("\n--- Internships ---")
internships = db.query(Internship).all()
for i in internships:
    print(f"ID: {i.id}, Title: {i.title}, Employer: {i.employer.company_name if i.employer else 'None'}")
