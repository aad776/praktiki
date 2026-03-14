from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.credit import CreditRequest
from models.user import User
from models.student_profile import StudentProfile
from models.institute_profile import InstituteProfile
from utils.settings import settings

engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

requests = db.query(CreditRequest).all()
print(f"Total Credit Requests: {len(requests)}")
for req in requests:
    student = db.query(StudentProfile).filter(StudentProfile.id == req.student_id).first()
    inst_name = student.university_name if student else "Unknown"
    print(f"ID: {req.id}, Student: {req.student_id} ({inst_name}), Status: {req.status}, Pushed: {req.is_pushed_to_abc}")

institutes = db.query(User).filter(User.role == "institute").all()
print(f"Total Institutes: {len(institutes)}")
for inst in institutes:
    profile = db.query(InstituteProfile).filter(InstituteProfile.user_id == inst.id).first()
    name = profile.institute_name if profile else "No Profile"
    print(f"ID: {inst.id}, Email: {inst.email}, Name: {name}")
