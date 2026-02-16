import requests
import json

BASE_URL = "http://localhost:8000"

def test_login(email, password):
    url = f"{BASE_URL}/auth/login"
    payload = {"email": email, "password": password}
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed for {email}: {response.status_code} - {response.text}")
        return None

def test_get_students(token):
    url = f"{BASE_URL}/institutes/students"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        students = response.json()
        print(f"Found {len(students)} students")
        for s in students:
            print(f"- {s.get('full_name')} ({s.get('email')}) from {s.get('university_name')}")
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    # From previous check, we know there are UPES institute users.
    # We'll try one of them. We assume the password is 'password123' as per common test setup or we'll try to find it.
    # Since I don't know the password, I'll first check the database for a UPES institute user and maybe reset it or use a known one.
    
    # Let's try to find a UPES institute user email first.
    import sqlite3
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    cursor.execute("""
        SELECT u.email 
        FROM users u 
        JOIN institute_profiles ip ON u.id = ip.user_id 
        WHERE u.role='institute' AND ip.institute_name LIKE '%UPES%' 
        LIMIT 1
    """)
    user = cursor.fetchone()
    conn.close()
    
    if user:
        email = user[0]
        print(f"Testing with institute user: {email}")
        # Assuming default test password
        token = test_login(email, "password123")
        if token:
            test_get_students(token)
    else:
        print("No UPES institute user found")
