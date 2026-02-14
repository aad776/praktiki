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

def list_profiles():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("\n--- Institute Profiles ---")
    cursor.execute("""
        SELECT u.email, ip.institute_name, ip.aishe_code 
        FROM institute_profiles ip 
        JOIN users u ON ip.user_id = u.id
    """)
    for row in cursor.fetchall():
        print(f"Email: {row[0]} | Name: {row[1]} | AISHE: {row[2]}")

    print("\n--- Employer Profiles ---")
    cursor.execute("""
        SELECT u.email, ep.company_name 
        FROM employer_profiles ep 
        JOIN users u ON ep.user_id = u.id
    """)
    for row in cursor.fetchall():
        print(f"Email: {row[0]} | Company: {row[1]}")

    print("\n--- Student Profiles (First 5) ---")
    cursor.execute("""
        SELECT u.email, sp.university_name 
        FROM student_profiles sp 
        JOIN users u ON sp.user_id = u.id
        LIMIT 5
    """)
    for row in cursor.fetchall():
        print(f"Email: {row[0]} | University: {row[1]}")
        
    conn.close()

if __name__ == "__main__":
    list_profiles()
