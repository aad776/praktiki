
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def check_institute_name(email):
    db = SessionLocal()
    try:
        query = text("""
            SELECT ip.institute_name 
            FROM institute_profiles ip 
            JOIN users u ON u.id = ip.user_id 
            WHERE u.email = :email
        """)
        result = db.execute(query, {"email": email}).first()
        if result:
            print(f"Institute Name for {email}: {result[0]}")
        else:
            print(f"No institute profile found for {email}")
    finally:
        db.close()

if __name__ == "__main__":
    check_institute_name("harshtapadia10@gmail.com")
