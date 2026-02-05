
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.join(os.getcwd(), "PythonProject"))

from utils.settings import settings
from models.application import Application
from models.student_profile import StudentProfile
from models.internship import Internship

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("--- Applications ---")
apps = db.query(Application).all()
for app in apps:
    student = db.query(StudentProfile).filter(StudentProfile.id == app.student_id).first()
    internship = db.query(Internship).filter(Internship.id == app.internship_id).first()
    student_name = student.full_name if student else "Unknown"
    internship_title = internship.title if internship else "Unknown"
    print(f"ID: {app.id}, Student: {student_name}, Internship: {internship_title}, Status: {app.status}")

if not apps:
    print("No applications found in database.")

db.close()
