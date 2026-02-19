import requests
import json

BASE_URL = "http://localhost:8000"

# Login as Employer
def login(email, password):
    response = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    if response.status_code == 200:
        return response.json()["access_token"]
    print(f"Login failed: {response.text}")
    return None

def test_endpoints():
    # 1. Test Employer Login and Data
    print("--- Testing Employer Data ---")
    token = login("employer@example.com", "password123") # Assuming default password
    if token:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get Profile
        try:
            resp = requests.get(f"{BASE_URL}/employers/profile", headers=headers)
            print(f"Profile Status: {resp.status_code}")
            if resp.status_code == 200:
                print("Profile Data:", resp.json().get("company_name"))
        except Exception as e:
            print(f"Profile Error: {e}")

        # Get Posted Internships
        try:
            resp = requests.get(f"{BASE_URL}/employers/my-internships", headers=headers)
            print(f"My Internships Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                print(f"Count: {len(data)}")
                if len(data) > 0:
                    print("Sample:", data[0].get("title"))
        except Exception as e:
            print(f"Internships Error: {e}")

    # 2. Test Student Login and Data
    print("\n--- Testing Student Data ---")
    # Need a valid student email
    # Let's try 'harshtapadia11@gmail.com' from the check_orphans output
    token = login("harshtapadia11@gmail.com", "password123") 
    if token:
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get Internships List
        try:
            resp = requests.get(f"{BASE_URL}/students/internships", headers=headers)
            print(f"Student Internships Status: {resp.status_code}")
            if resp.status_code == 200:
                data = resp.json()
                print(f"Count: {len(data)}")
                if len(data) > 0:
                    print("Sample:", data[0].get("title"))
        except Exception as e:
            print(f"Student Internships Error: {e}")

if __name__ == "__main__":
    test_endpoints()
