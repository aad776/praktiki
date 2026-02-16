from db.session import SessionLocal
from models.user import User
from utils.security import get_password_hash

def reset_password():
    db = SessionLocal()
    user = db.query(User).filter(User.email == "harshtapadia10@gmail.com").first()
    if user:
        user.hashed_password = get_password_hash("password123")
        db.commit()
        print(f"Password reset for {user.email}")
    else:
        print("User not found")
    db.close()

if __name__ == "__main__":
    reset_password()
