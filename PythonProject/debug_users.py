import sqlite3
from passlib.context import CryptContext

# Configuration
DB_PATH = 'test.db'
pwd_context = CryptContext(
    schemes=["bcrypt", "sha256_crypt"],
    deprecated="auto",
    default="sha256_crypt"
)

def verify_password(plain_password, hashed_password):
    if not hashed_password:
        return False
    try:
        return pwd_context.verify(str(plain_password), hashed_password)
    except Exception:
        return False

def check_users():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print(f"--- Users in {DB_PATH} ---")
    cursor.execute("SELECT id, email, full_name, role, hashed_password FROM users")
    users = cursor.fetchall()
    
    for user in users:
        uid, email, name, role, hashed = user
        print(f"ID: {uid} | Email: {email} | Name: {name} | Role: {role}")
        # Test if password is 'password123' (a common default reset)
        if verify_password('password123', hashed):
            print(f"  -> Password matches 'password123'")
        else:
            print(f"  -> Password does NOT match 'password123'")
    
    conn.close()

if __name__ == "__main__":
    check_users()
