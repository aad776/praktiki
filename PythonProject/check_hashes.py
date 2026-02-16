import sqlite3
import os

db_path = 'test.db'
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT email, hashed_password FROM users")
    users = cursor.fetchall()
    print("User hashes:")
    for email, hashed in users:
        print(f"{email}: {hashed[:20]}...")
    conn.close()
else:
    print(f"{db_path} not found")
