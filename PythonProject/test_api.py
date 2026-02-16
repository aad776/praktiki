import requests
import json

def test_institute_students():
    # Login as institute
    login_url = "http://localhost:8000/api/v1/auth/login"
    login_data = {
        "username": "harshtapadia10@gmail.com",
        "password": "password123" # Assuming this is the password
    }
    
    try:
        response = requests.post(login_url, data=login_data)
        if response.status_code != 200:
            print(f"Login failed: {response.text}")
            return
        
        token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get students
        students_url = "http://localhost:8000/api/v1/institutes/students"
        response = requests.get(students_url, headers=headers)
        
        print(f"Students API Status: {response.status_code}")
        if response.status_code == 200:
            students = response.json()
            print(f"Found {len(students)} students")
            for s in students:
                print(f"- {s['name']} ({s['email']})")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    test_institute_students()
