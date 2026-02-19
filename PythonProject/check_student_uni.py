
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models.student_profile import StudentProfile

DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_student_uni():
    db = SessionLocal()
    try:
        student = db.query(StudentProfile).filter(StudentProfile.id == 23).first()
        if student:
            print(f"Student ID: 23, University: {student.university_name}, First Name: {student.first_name}")
        else:
            print("Student ID 23 not found.")
    finally:
        db.close()

if __name__ == "__main__":
    check_student_uni()
