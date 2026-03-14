
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models.application import Application
from models.internship import Internship

DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_apps():
    db = SessionLocal()
    try:
        app_ids = [57, 75]
        for app_id in app_ids:
            app = db.query(Application).filter(Application.id == app_id).first()
            if app:
                print(f"App ID: {app_id}, Internship ID: {app.internship_id}, Student ID: {app.student_id}")
                
                internship = db.query(Internship).filter(Internship.id == app.internship_id).first()
                if internship:
                    print(f"  Internship ID: {internship.id}, Title: {internship.title}, Employer ID: {internship.employer_id}")
            else:
                print(f"App ID: {app_id} not found.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_apps()
