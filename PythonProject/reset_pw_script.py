
import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.append(os.getcwd())

from db.session import engine
from models.user import User
from utils.security import get_password_hash

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
db = SessionLocal()

def reset_password(email, new_password):
    user = db.query(User).filter(User.email == email).first()
    if user:
        user.hashed_password = get_password_hash(new_password)
        db.commit()
        print(f"Password for {email} reset successfully.")
    else:
        print(f"User {email} not found.")

if __name__ == "__main__":
    reset_password("harshtapadia10@gmail.com", "password123")
