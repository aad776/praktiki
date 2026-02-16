from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json

from models.student_profile import StudentResume
from db.session import Base # Import Base to ensure metadata is available

# Database connection
engine = create_engine('sqlite:///./test.db')
Session = sessionmaker(bind=engine)
db = Session()

try:
    # Ensure tables are created if not already
    Base.metadata.create_all(bind=engine)

    student_id_to_update = 21
    
    # Find the student resume entry
    student_resume = db.query(StudentResume).filter(StudentResume.student_id == student_id_to_update).first()

    # Dummy JSON content to be distributed
    dummy_resume_data = {
        "career_objective": "To secure a challenging position in a reputable organization to expand my learnings, knowledge, and skills.",
        "education": [{"degree": "B.Tech", "university": "University 27", "year": 2025}],
        "work_experience": [{"title": "Junior Developer", "company": "Tech Solutions", "years": "2024-Present", "description": "Developed and maintained web applications using Python and FastAPI."}]
    }

    if student_resume:
        print(f"Updating StudentResume for student_id: {student_id_to_update}")
        student_resume.resume_file_path = 'secure_uploads/resumes/dummy_resume.txt'
        student_resume.resume_filename = 'dummy_resume.txt'
        student_resume.resume_file_size = 100
        student_resume.resume_uploaded_at = datetime.now()
        student_resume.career_objective = dummy_resume_data["career_objective"]
        student_resume.education_entries = json.dumps(dummy_resume_data["education"])
        student_resume.work_experience = json.dumps(dummy_resume_data["work_experience"])
        db.commit()
        print("StudentResume updated successfully.")
    else:
        print(f"No StudentResume found for student_id: {student_id_to_update}. Creating a new one.")
        new_student_resume = StudentResume(
            student_id=student_id_to_update,
            resume_file_path='secure_uploads/resumes/dummy_resume.txt',
            resume_filename='dummy_resume.txt',
            resume_file_size=100,
            resume_uploaded_at=datetime.now(),
            career_objective = dummy_resume_data["career_objective"],
            education_entries = json.dumps(dummy_resume_data["education"]),
            work_experience = json.dumps(dummy_resume_data["work_experience"])
        )
        db.add(new_student_resume)
        db.commit()
        print("New StudentResume created successfully.")

except Exception as e:
    db.rollback()
    print(f"An error occurred: {e}")
finally:
    db.close()
