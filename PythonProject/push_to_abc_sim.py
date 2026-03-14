
import requests

BASE_URL = "http://localhost:8000"
ABC_URL = "http://localhost:8002"

def login(email, password):
    url = f"{BASE_URL}/auth/login"
    data = {
        "email": email, 
        "password": password,
        "apaar_id": None
    }
    print(f"Logging in to {url} with {email}...")
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            print("Login successful.")
            return response.json()["access_token"]
        else:
            print(f"Login failed: {response.status_code} {response.text}")
            return None
    except Exception as e:
        print(f"Connection error: {e}")
        return None

def get_credit_requests(token):
    url = f"{BASE_URL}/institutes/credit-requests"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        print(f"Failed to fetch requests: {response.status_code} {response.text}")
        return []

def push_credit(token, request_id):
    url = f"{BASE_URL}/institutes/credit-requests/{request_id}/push-to-abc"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(url, headers=headers)
    print(f"Push Response ({response.status_code}): {response.text}")
    return response.status_code == 200

if __name__ == "__main__":
    email = "harshtapadia10@gmail.com"
    password = "password123"
    
    print(f"Logging in as {email}...")
    token = login(email, password)
    
    if token:
        print("Login successful. Fetching credit requests...")
        requests_list = get_credit_requests(token)
        print(f"Found {len(requests_list)} requests.")
        
        for req in requests_list:
            print(f"ID: {req['id']}, Student: {req['student_id']}, Status: {req['status']}, Pushed: {req.get('is_pushed_to_abc')}")
            
            if req['status'] == 'approved' and not req.get('is_pushed_to_abc'):
                print(f"Attempting to push Request ID {req['id']}...")
                success = push_credit(token, req['id'])
                if success:
                    print(f"Successfully pushed Request ID {req['id']}!")
                else:
                    print(f"Failed to push Request ID {req['id']}.")
            elif req['status'] == 'approved' and req.get('is_pushed_to_abc'):
                 print(f"Request ID {req['id']} already pushed. Re-pushing to verify updates...")
                 success = push_credit(token, req['id'])
                 if success:
                    print(f"Successfully re-pushed Request ID {req['id']}!")
    else:
        print("Aborting.")
