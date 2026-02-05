import os
import sys
import random
from sqlalchemy.orm import Session

# Add the current directory and parent directory to sys.path
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), ".."))

from db.session import SessionLocal
from models.student_profile import StudentProfile
from models.internship import Internship
from models.application import Application

def seed_applications():
    db = SessionLocal()
    try:
        students = db.query(StudentProfile).all()
        internships = db.query(Internship).all()

        if not students or not internships:
            print("No students or internships found in the database. Run generate_dummy_data.py first.")
            return

        print(f"Found {len(students)} students and {len(internships)} internships.")
        
        # Create about 50 random applications
        created_count = 0
        for _ in range(50):
            student = random.choice(students)
            internship = random.choice(internships)
            
            # Check if application already exists
            existing = db.query(Application).filter(
                Application.student_id == student.id,
                Application.internship_id == internship.id
            ).first()
            
            if not existing:
                app = Application(
                    student_id=student.id,
                    internship_id=internship.id,
                    status=random.choice(["pending", "accepted", "rejected"]),
                )
                db.add(app)
                created_count += 1
        
        db.commit()
        print(f"Successfully created {created_count} random applications.")
        
    except Exception as e:
        print(f"Error seeding applications: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_applications()
