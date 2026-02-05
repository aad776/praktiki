
import sqlite3
import os

db_path = os.path.join('PythonProject', 'test.db')
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

print("--- Tables ---")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
for table in tables:
    print(table[0])

print("\n--- Applications ---")
cursor.execute("SELECT * FROM applications;")
apps = cursor.fetchall()
for app in apps:
    print(app)

print("\n--- Student Profiles ---")
cursor.execute("SELECT id, user_id, full_name, first_name, last_name FROM student_profiles;")
students = cursor.fetchall()
for student in students:
    print(student)

print("\n--- Internships ---")
cursor.execute("SELECT id, title, employer_id FROM internships LIMIT 5;")
internships = cursor.fetchall()
for internship in internships:
    print(internship)

conn.close()
