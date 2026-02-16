import sqlite3
from passlib.context import CryptContext

# Configuration
DB_PATH = 'test.db'
pwd_context = CryptContext(
    schemes=["bcrypt", "sha256_crypt"],
    deprecated="auto",
    default="sha256_crypt"
)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(str(password))

def reset_all_passwords():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Use a fixed hash for 'password123' to be efficient
    new_hash = get_password_hash('password123')
    
    print(f"Updating all users in {DB_PATH} to password: 'password123'...")
    cursor.execute("UPDATE users SET hashed_password = ?", (new_hash,))
    
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    
    print(f"Successfully updated {affected} users.")

if __name__ == "__main__":
    reset_all_passwords()
