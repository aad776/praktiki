
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models.student_profile import StudentProfile
from models.user import User

DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_student_email(student_id):
    db = SessionLocal()
    try:
        student = db.query(StudentProfile).filter(StudentProfile.id == student_id).first()
        if student:
            user = db.query(User).filter(User.id == student.user_id).first()
            if user:
                print(f"Student ID {student_id} Email: {user.email}")
            else:
                print(f"User for Student ID {student_id} not found.")
        else:
            print(f"Student ID {student_id} not found.")
    finally:
        db.close()

if __name__ == "__main__":
    check_student_email(23)
