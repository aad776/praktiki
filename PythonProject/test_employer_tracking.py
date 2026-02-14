import requests
import sqlite3

BASE_URL = "http://localhost:8000"

def get_token(email, password="password123"):
    url = f"{BASE_URL}/auth/login"
    payload = {"email": email, "password": password}
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return response.json()["access_token"]
    return None

def test_employer_tracking():
    # 1. Get a student and an internship
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    
    # Get student
    cursor.execute("SELECT email FROM users WHERE role='student' LIMIT 1")
    student_email = cursor.fetchone()[0]
    
    # Get internship and its employer (different from student)
    cursor.execute("""
        SELECT i.id, u.email 
        FROM internships i 
        JOIN employer_profiles ep ON i.employer_id = ep.id 
        JOIN users u ON ep.user_id = u.id 
        WHERE u.email != ?
        LIMIT 1
    """, (student_email,))
    internship_id, employer_email = cursor.fetchone()
    conn.close()
    
    print(f"Testing with Student: {student_email}, Employer: {employer_email}, Internship: {internship_id}")
    
    student_token = get_token(student_email)
    employer_token = get_token(employer_email)
    
    if not student_token or not employer_token:
        print("Failed to get tokens")
        return

    # 2. Student applies
    apply_url = f"{BASE_URL}/students/apply"
    headers = {"Authorization": f"Bearer {student_token}"}
    payload = {"internship_id": internship_id}
    response = requests.post(apply_url, headers=headers, json=payload)
    print(f"Apply status: {response.status_code}")
    if response.status_code != 200 and "already applied" not in response.text.lower():
        print(f"Apply failed: {response.text}")
        # We continue because they might have already applied
    
    # 3. Get application ID
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM applications WHERE internship_id=? ORDER BY id DESC LIMIT 1", (internship_id,))
    app_id = cursor.fetchone()[0]
    conn.close()
    
    # 4. Employer marks as completed
    complete_url = f"{BASE_URL}/employers/applications/{app_id}/complete"
    headers = {"Authorization": f"Bearer {employer_token}"}
    payload = {
        "hours_worked": 150,
        "policy_type": "UGC"
    }
    response = requests.put(complete_url, headers=headers, json=payload)
    print(f"Complete status: {response.status_code}")
    print(f"Response: {response.json()}")

if __name__ == "__main__":
    test_employer_tracking()
