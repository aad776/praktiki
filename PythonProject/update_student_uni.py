
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.student_profile import StudentProfile

DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def update_student_uni():
    db = SessionLocal()
    try:
        student = db.query(StudentProfile).filter(StudentProfile.id == 23).first()
        if student:
            print(f"Updating Student ID 23 university from '{student.university_name}' to 'UPES'")
            student.university_name = "UPES"
            db.commit()
            print("Update successful.")
        else:
            print("Student ID 23 not found.")
    finally:
        db.close()

if __name__ == "__main__":
    update_student_uni()
