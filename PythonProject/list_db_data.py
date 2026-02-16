import sqlite3

def list_institute_users():
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    cursor.execute("SELECT email, role FROM users WHERE role='institute'")
    users = cursor.fetchall()
    print("Institute Users:")
    for user in users:
        print(f"Email: {user[0]}, Role: {user[1]}")
    
    cursor.execute("SELECT full_name, university_name FROM student_profiles")
    students = cursor.fetchall()
    print("\nStudent Profiles:")
    for s in students:
        print(f"Name: {s[0]}, Uni: {s[1]}")
    
    conn.close()

if __name__ == "__main__":
    list_institute_users()
