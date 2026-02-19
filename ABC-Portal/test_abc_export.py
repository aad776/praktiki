
import requests

ABC_URL = "http://localhost:8002"

def login(email, password):
    url = f"{ABC_URL}/auth/login"
    data = {
        "username": email, 
        "password": password
    }
    print(f"Logging in to {url} with {email}...")
    response = requests.post(url, data=data)
    if response.status_code == 200:
        print("Login successful.")
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.status_code} {response.text}")
        return None

def test_export_csv(token):
    url = f"{ABC_URL}/institute/export/csv"
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Requesting CSV export from {url}...")
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        print("Export CSV successful.")
        content = response.content.decode('utf-8')
        print("CSV Content Preview:")
        print(content[:500]) # Print first 500 chars
        return True
    else:
        print(f"Export CSV failed: {response.status_code} {response.text}")
        return False

def test_export_pdf(token):
    url = f"{ABC_URL}/institute/export/pdf"
    headers = {"Authorization": f"Bearer {token}"}
    print(f"Requesting PDF export from {url}...")
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        print("Export PDF successful.")
        print(f"PDF Size: {len(response.content)} bytes")
        return True
    else:
        print(f"Export PDF failed: {response.status_code} {response.text}")
        return False

if __name__ == "__main__":
    email = "harshtapadia10@gmail.com"
    password = "password123"
    
    token = login(email, password)
    
    if token:
        test_export_csv(token)
        test_export_pdf(token)
    else:
        print("Aborting.")
