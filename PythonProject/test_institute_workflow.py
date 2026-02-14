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

def test_institute_workflow():
    # 1. Find a UPES institute user and their students' credit requests
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    
    # Get UPES institute
    cursor.execute("""
        SELECT u.email, ip.id 
        FROM users u 
        JOIN institute_profiles ip ON u.id = ip.user_id 
        WHERE ip.institute_name LIKE '%UPES%' 
        LIMIT 1
    """)
    institute_email, institute_id = cursor.fetchone()
    
    # Get a pending credit request for a student of this institute
    cursor.execute("""
        SELECT cr.id, u.email as student_email 
        FROM credit_requests cr 
        JOIN student_profiles sp ON cr.student_id = sp.id 
        JOIN users u ON sp.user_id = u.id 
        WHERE cr.status = 'pending'
        LIMIT 1
    """)
    res = cursor.fetchone()
    if not res:
        print("No pending credit requests found. Run test_employer_tracking.py first.")
        conn.close()
        return
        
    request_id, student_email = res
    conn.close()
    
    print(f"Testing with Institute: {institute_email}, Request ID: {request_id}, Student: {student_email}")
    
    institute_token = get_token(institute_email)
    if not institute_token:
        print("Failed to get institute token")
        return

    headers = {"Authorization": f"Bearer {institute_token}"}

    # 2. Approve Credit Request
    approve_url = f"{BASE_URL}/institutes/credit-requests/{request_id}/approve"
    response = requests.post(approve_url, headers=headers)
    print(f"Approve status: {response.status_code}")
    print(f"Approve response: {response.json()}")

    # 3. Push to ABC
    push_url = f"{BASE_URL}/institutes/credit-requests/{request_id}/push-to-abc"
    response = requests.post(push_url, headers=headers)
    print(f"Push to ABC status: {response.status_code}")
    print(f"Push to ABC response: {response.json()}")

if __name__ == "__main__":
    test_institute_workflow()
