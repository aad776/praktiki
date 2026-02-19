from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models.internship import Internship
from models.employer_profile import EmployerProfile
from models.student_profile import StudentProfile
from models.user import User
from utils.settings import settings
from sqlalchemy import create_engine

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

print("--- Checking Users ---")
users = db.query(User).all()
print(f"Total Users: {len(users)}")
for u in users:
    print(f"ID: {u.id}, Email: {u.email}, Role: {u.role}")

print("\n--- Checking Student Profiles ---")
students = db.query(StudentProfile).all()
print(f"Total Student Profiles: {len(students)}")
for s in students:
    print(f"ID: {s.id}, UserID: {s.user_id}, Name: {s.full_name}")

print("\n--- Checking Employer Profiles ---")
employers = db.query(EmployerProfile).all()
print(f"Total Employer Profiles: {len(employers)}")
for e in employers:
    print(f"ID: {e.id}, UserID: {e.user_id}, Company: {e.company_name}")

print("\n--- Checking Internships ---")
internships = db.query(Internship).all()
print(f"Total Internships: {len(internships)}")
for i in internships:
    employer = db.query(EmployerProfile).filter(EmployerProfile.id == i.employer_id).first()
    employer_name = employer.company_name if employer else "UNKNOWN"
    print(f"ID: {i.id}, Title: {i.title}, EmployerID: {i.employer_id} ({employer_name}), Status: {i.status}")

db.close()
