
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.join(os.getcwd(), "PythonProject"))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from db.session import SessionLocal, Base, engine
from models.internship import Internship
from models.employer_profile import EmployerProfile

def verify_internships():
    db = SessionLocal()
    try:
        # Count all internships
        total_count = db.query(Internship).count()
        print(f"Total internships in DB: {total_count}")
        
        # Count active internships
        active_count = db.query(Internship).filter(Internship.status == "active").count()
        print(f"Active internships in DB: {active_count}")
        
        if total_count < 10:
            print("WARNING: Low internship count.")
        else:
            print("Internship count looks sufficient.")
            
        # Verify relationship with Employer
        internships_with_employer = db.query(Internship).join(EmployerProfile).count()
        print(f"Internships with valid Employer: {internships_with_employer}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify_internships()
