
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models.credit import CreditRequest

DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_credit_requests():
    db = SessionLocal()
    try:
        # Check if table exists
        query = text("SELECT name FROM sqlite_master WHERE type='table' AND name='credit_requests'")
        if not db.execute(query).first():
            print("credit_requests table does not exist.")
            return

        # Fetch requests
        requests = db.query(CreditRequest).all()
        print(f"Found {len(requests)} credit requests.")
        for req in requests:
            print(f"ID: {req.id}, Student ID: {req.student_id}, App ID: {req.application_id}, Status: {req.status}, Policy: {req.policy_type}, Credits: {req.credits_calculated}, Pushed: {req.is_pushed_to_abc}")
            
            # If request ID 1 is not approved, approve it
            if req.id == 1 and req.status != 'approved':
                print(f"Approving request {req.id}...")
                req.status = 'approved'
                db.commit()
                print(f"Request {req.id} approved.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_credit_requests()
