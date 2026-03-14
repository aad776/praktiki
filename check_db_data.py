
import sys
import os

# Set environment variables manually
os.environ["DATABASE_URL"] = "sqlite:///PythonProject/test.db"
os.environ["JWT_SECRET"] = "MAIN_GAREEB_HUN"

# Add project root to path
sys.path.append(os.path.abspath("PythonProject"))

from db.session import engine
from models.employer_profile import EmployerProfile
from models.internship import Internship
from models.user import User
from models.student_profile import StudentProfile, StudentResume
from sqlalchemy.orm import sessionmaker

SessionLocal = sessionmaker(bind=engine)
session = SessionLocal()

def check_data():
    print("Checking database data...")
    
    # Check users
    users = session.query(User).all()
    print(f"Total Users: {len(users)}")
    
    # Check student profiles
    profiles = session.query(StudentProfile).all()
    print(f"Total Student Profiles: {len(profiles)}")
    
    # Check if profiles have data
    for p in profiles:
        user = session.query(User).filter(User.id == p.user_id).first()
        if user:
            print(f"Student Profile ID: {p.id}, User: {user.email}")
            
    # Check users without profile
    users_with_profile = {p.user_id for p in profiles}
    users_without_profile = [u.email for u in users if u.role == 'student' and u.id not in users_with_profile]
    if users_without_profile:
        print(f"Students without profile: {users_without_profile}")
    else:
        print("All students have profiles.")

    # Check Student Resumes
    resumes = session.query(StudentResume).all()
    print(f"Total Student Resumes: {len(resumes)}")
    
    for r in resumes:
        student = session.query(StudentProfile).filter(StudentProfile.id == r.student_id).first()
        if student:
             user = session.query(User).filter(User.id == student.user_id).first()
             print(f"Resume ID: {r.id}, Student User: {user.email if user else 'Unknown'}")

    employers = session.query(EmployerProfile).all()
    print(f"Total Employer Profiles: {len(employers)}")
    
    # Check internships
    internships = session.query(Internship).all()
    print(f"Total Internships: {len(internships)}")
    
    # Find an employer with internships
    for emp in employers:
        count = session.query(Internship).filter(Internship.employer_id == emp.id).count()
        if count > 0:
            user = session.query(User).filter(User.id == emp.user_id).first()
            if user:
                print(f"Employer ID: {emp.id}, User: {user.email}, Internships: {count}")

    # Check for internships with NO employer
    orphaned = session.query(Internship).filter(Internship.employer_id == None).count()
    print(f"Orphaned Internships (no employer_id): {orphaned}")
    
    # Check for internships with employer_id that DOES NOT exist in employer_profiles
    invalid_employer = 0
    for i in internships:
        if i.employer_id:
            exists = session.query(EmployerProfile).filter(EmployerProfile.id == i.employer_id).first()
            if not exists:
                invalid_employer += 1
                # print(f"Internship {i.id} has invalid employer_id: {i.employer_id}")
    
    print(f"Internships with invalid employer_id: {invalid_employer}")

if __name__ == "__main__":
    check_data()
