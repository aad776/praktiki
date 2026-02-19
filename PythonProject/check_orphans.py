from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add project root to sys.path
sys.path.append(os.getcwd())

from db.session import engine
from models.user import User
from models.student_profile import StudentProfile
from models.employer_profile import EmployerProfile
from models.internship import Internship
from models.application import Application

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

try:
    print("--- Orphaned Internships Check ---")
    employer_ids = [e.id for e in db.query(EmployerProfile.id).all()]
    print(f"Employer Profile IDs: {employer_ids}")

    orphaned_count = db.query(Internship).filter(~Internship.employer_id.in_(employer_ids)).count()
    print(f"Orphaned Internships (employer_id not in EmployerProfiles): {orphaned_count}")
    
    total_internships = db.query(Internship).count()
    print(f"Total Internships: {total_internships}")

    if orphaned_count > 0:
        print("SAMPLE ORPHANED INTERNSHIP:")
        orphan = db.query(Internship).filter(~Internship.employer_id.in_(employer_ids)).first()
        print(f"ID: {orphan.id}, Title: {orphan.title}, EmployerID: {orphan.employer_id}")

    print("\n--- Internship Status Check ---")
    active_count = db.query(Internship).filter(Internship.status == "active").count()
    print(f"Active Internships: {active_count}")
    
    print("\n--- User Role Check ---")
    users = db.query(User.email, User.role).limit(10).all()
    for u in users:
        print(f"{u.email}: {u.role}")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
