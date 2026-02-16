import requests
import json

url = "http://localhost:8000/auth/login"
payload = {
    "email": "harshtapadia11@gmail.com",
    "password": "password123"
}
headers = {
    "Content-Type": "application/json"
}

try:
    response = requests.post(url, data=json.dumps(payload), headers=headers)
    print(f"Login Status: {response.status_code}")
    print(f"Login Response: {response.text}")
    
    if response.status_code == 200:
        token = response.json().get("access_token")
        print(f"Token: {token[:20]}...")
        
        me_url = "http://localhost:8000/students/me"
        me_headers = {
            "Authorization": f"Bearer {token}"
        }
        me_response = requests.get(me_url, headers=me_headers)
        print(f"Me Status: {me_response.status_code}")
        print(f"Me Response: {me_response.text}")
except Exception as e:
    print(f"Error: {e}")
