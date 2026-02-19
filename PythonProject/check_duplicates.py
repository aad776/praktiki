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
from sqlalchemy import func

db = SessionLocal()

print("--- Checking for Duplicates ---")

# Check Internships
print("\nInternships with same title and employer:")
dupe_internships = db.query(Internship.title, Internship.employer_id, func.count(Internship.id)).group_by(Internship.title, Internship.employer_id).having(func.count(Internship.id) > 1).all()
for title, emp_id, count in dupe_internships:
    emp = db.query(EmployerProfile).filter(EmployerProfile.id == emp_id).first()
    emp_name = emp.company_name if emp else "Unknown"
    print(f"Title: {title}, Employer: {emp_name} (ID: {emp_id}), Count: {count}")

# Check Applications
print("\nApplications for same student and internship:")
dupe_apps = db.query(Application.student_id, Application.internship_id, func.count(Application.id)).group_by(Application.student_id, Application.internship_id).having(func.count(Application.id) > 1).all()
for stud_id, intern_id, count in dupe_apps:
    print(f"Student ID: {stud_id}, Internship ID: {intern_id}, Count: {count}")

# Check Credit Requests
print("\nCredit Requests for same student and application:")
dupe_creds = db.query(CreditRequest.student_id, CreditRequest.application_id, func.count(CreditRequest.id)).group_by(CreditRequest.student_id, CreditRequest.application_id).having(func.count(CreditRequest.id) > 1).all()
for stud_id, app_id, count in dupe_creds:
    print(f"Student ID: {stud_id}, Application ID: {app_id}, Count: {count}")

print("\n--- Listing All Credit Requests ---")
creds = db.query(CreditRequest).all()
for c in creds:
    print(f"ID: {c.id}, AppID: {c.application_id}, StudentID: {c.student_id}, Pushed: {c.is_pushed_to_abc}, Status: {c.status}")
