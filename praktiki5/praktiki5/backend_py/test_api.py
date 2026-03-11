
import requests
import os
import json

BASE_URL = "http://127.0.0.1:8001"

def test_system():
    # 1. Register a test student
    print("\n--- Registering Student ---")
    student_data = {
        "name": "Ashish Panwar",
        "email": f"test_{os.urandom(2).hex()}@example.com",
        "password": "password123",
        "role": "student"
    }
    reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json=student_data)
    print(f"Status: {reg_resp.status_code}")
    
    # 2. Login
    print("\n--- Logging In ---")
    login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": student_data["email"],
        "password": student_data["password"]
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Upload Certificate
    print("\n--- Uploading Certificate ---")
    # Use one of the existing files in uploads
    upload_dir = "uploads"
    files = [f for f in os.listdir(upload_dir) if f.endswith(('.jpg', '.jpeg', '.png'))]
    if not files:
        print("No files found in uploads directory to test with.")
        return
        
    sample_file = os.path.join(upload_dir, files[0])
    print(f"Using sample file: {sample_file}")
    
    with open(sample_file, "rb") as f:
        upload_resp = requests.post(
            f"{BASE_URL}/api/certificates/upload",
            headers=headers,
            files={"file": (files[0], f, "image/jpeg")}
        )
    
    if upload_resp.status_code == 200:
        print("\n--- API OUTPUT (Extracted Data) ---")
        result = upload_resp.json()
        print(json.dumps(result, indent=2))
        
        # Also show the detailed verification summary
        if "verification_summary" in result:
            print("\n--- VERIFICATION SUMMARY ---")
            print(json.dumps(result["verification_summary"], indent=2))
    else:
        print(f"Upload failed with status {upload_resp.status_code}")
        print(upload_resp.text)

if __name__ == "__main__":
    test_system()
