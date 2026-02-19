
import requests
import json
import sys

# Constants
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/auth/login"
MY_INTERNSHIPS_URL = f"{BASE_URL}/employers/my-internships"

def test_employer_internships():
    print("Testing Employer Internships Fetching...")
    
    email = "testemployer@example.com"
    password = "password123"
    
    try:
        # Use JSON payload for login
        payload = {
            "email": email,
            "password": password
        }
        response = requests.post(LOGIN_URL, json=payload)
        
        if response.status_code != 200:
            print(f"Login failed (Status {response.status_code}). Attempting signup...")
            # Signup
            signup_payload = {
                "email": email,
                "password": password,
                "full_name": "Test Employer",
                "role": "employer",
                "company_name": "Test Corp",
                "contact_number": "1234567890"
            }
            signup_resp = requests.post(f"{BASE_URL}/auth/signup/employer", json=signup_payload)
            if signup_resp.status_code not in [200, 201]:
                 print(f"Signup failed: {signup_resp.text}")
                 return
            
            # Login again
            response = requests.post(LOGIN_URL, json=payload)
            if response.status_code != 200:
                print(f"Login failed after signup: {response.text}")
                return

        token_data = response.json()
        token = token_data.get("access_token")
        if not token:
             print(f"No token in response: {token_data}")
             return

        print("Login successful.")
        
        # 2. Fetch My Internships
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(MY_INTERNSHIPS_URL, headers=headers)
        
        if resp.status_code == 200:
            internships = resp.json()
            print(f"Successfully fetched {len(internships)} internships.")
            print("Internships:", json.dumps(internships, indent=2))
        else:
            print(f"Failed to fetch internships: {resp.status_code} - {resp.text}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_employer_internships()
