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
    user_count = db.query(User).count()
    student_count = db.query(StudentProfile).count()
    employer_count = db.query(EmployerProfile).count()
    internship_count = db.query(Internship).count()
    application_count = db.query(Application).count()

    print(f"Users: {user_count}")
    print(f"Student Profiles: {student_count}")
    print(f"Employer Profiles: {employer_count}")
    print(f"Internships: {internship_count}")
    print(f"Applications: {application_count}")

    # Check for specific user if email provided (optional)
    # users = db.query(User).all()
    # for u in users:
    #     print(f"User: {u.email}, Role: {u.role}")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
