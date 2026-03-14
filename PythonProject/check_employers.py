
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models.employer_profile import EmployerProfile

DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_employers():
    db = SessionLocal()
    try:
        emp_ids = [3, 5]
        for emp_id in emp_ids:
            emp = db.query(EmployerProfile).filter(EmployerProfile.id == emp_id).first()
            if emp:
                print(f"Employer ID: {emp_id}, Company: {emp.company_name}, User ID: {emp.user_id}")
            else:
                print(f"Employer ID: {emp_id} not found.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_employers()
