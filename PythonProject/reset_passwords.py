from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.user import User
from utils.security import get_password_hash

engine = create_engine('sqlite:///./test.db')
Session = sessionmaker(bind=engine)
db = Session()

users = db.query(User).all()
for user in users:
    user.hashed_password = get_password_hash("password123")
db.commit()
print(f"Reset password for {len(users)} users to 'password123'")
db.close()
