
import sys
import os
sys.path.append(os.getcwd())

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from backend.models.credit import CreditRequest
from backend.models.user import User, StudentProfile
from backend.models.internship import Application, Internship
from backend.core.config import settings

DATABASE_URL = settings.DATABASE_URL
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_abc_credits():
    db = SessionLocal()
    try:
        # Check if table exists
        query = text("SELECT name FROM sqlite_master WHERE type='table' AND name='credit_requests'")
        if not db.execute(query).first():
            print("credit_requests table does not exist.")
            return

        # Fetch credits
        credits = db.query(CreditRequest).all()
        print(f"Found {len(credits)} credit requests.")
        for cred in credits:
            student_name = "Unknown"
            internship_title = "Unknown"
            company_name = "Unknown"
            
            # Fetch related data manually to avoid relationship loading issues if models differ
            student = db.query(StudentProfile).filter(StudentProfile.id == cred.student_id).first()
            if student:
                user = db.query(User).filter(User.id == student.user_id).first()
                if user:
                    student_name = user.full_name
            
            app = db.query(Application).filter(Application.id == cred.application_id).first()
            if app:
                intern = db.query(Internship).filter(Internship.id == app.internship_id).first()
                if intern:
                    internship_title = intern.title
                    # Employer
                    from backend.models.user import EmployerProfile
                    emp = db.query(EmployerProfile).filter(EmployerProfile.id == intern.employer_id).first()
                    if emp:
                        company_name = emp.company_name

            print(f"ID: {cred.id}, Student: {student_name}, Internship: {internship_title}, Company: {company_name}, Credits: {cred.credits_calculated}, Status: {cred.status}, Pushed: {cred.is_pushed_to_abc}")

    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    check_abc_credits()
