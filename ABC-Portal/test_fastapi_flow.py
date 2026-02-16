import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def register(username, email, role, password="password123"):
    print(f"Registering {role}: {username}...")
    resp = requests.post(f"{BASE_URL}/auth/register", json={
        "username": username,
        "email": email,
        "role": role,
        "password": password
    })
    if resp.status_code == 200:
        return resp.json()
    elif resp.status_code == 400 and "already registered" in resp.text:
        print("  Already registered.")
        return {"username": username} # Dummy return
    else:
        print(f"  Failed: {resp.text}")
        sys.exit(1)

def login(username, password="password123"):
    print(f"Logging in {username}...")
    resp = requests.post(f"{BASE_URL}/auth/login", data={
        "username": username,
        "password": password
    })
    if resp.status_code == 200:
        return resp.json()["access_token"]
    else:
        print(f"  Login Failed: {resp.text}")
        sys.exit(1)

def run_test():
    # 1. Setup Users
    register("google_inc", "hr@google.com", "company")
    register("student_ash", "ash@college.edu", "student")
    register("iit_admin", "admin@iit.edu", "institute")

    company_token = login("google_inc")
    student_token = login("student_ash")
    institute_token = login("iit_admin")

    company_headers = {"Authorization": f"Bearer {company_token}"}
    student_headers = {"Authorization": f"Bearer {student_token}"}
    institute_headers = {"Authorization": f"Bearer {institute_token}"}

    # 2. Post Internship
    print("\n>>> Posting Internship...")
    resp = requests.post(f"{BASE_URL}/company/internship", json={
        "title": "FastAPI Developer",
        "description": "Build backend"
    }, headers=company_headers)
    assert resp.status_code == 200
    internship_id = resp.json()["id"]
    print(f"  Internship ID: {internship_id}")

    # 3. Apply
    print("\n>>> Student Applying...")
    resp = requests.post(f"{BASE_URL}/student/apply", json={
        "internship_id": internship_id
    }, headers=student_headers)
    if resp.status_code == 200:
        app_id = resp.json()["id"]
        print(f"  Application ID: {app_id}")
    elif resp.status_code == 400 and "Already applied" in resp.text:
        # Fetch existing app to continue test
        print("  Already applied, fetching ID...")
        # For simplicity, assuming ID 1 if restart, or we need an endpoint to get my apps.
        # Let's hit dashboard to get app id
        dash = requests.get(f"{BASE_URL}/student/dashboard", headers=student_headers).json()
        app_id = dash["applications"][0]["id"]
    else:
        print(f"  Failed: {resp.text}")
        sys.exit(1)

    # 4. Complete
    print("\n>>> Completing Internship (60h UGC)...")
    resp = requests.post(f"{BASE_URL}/company/application/{app_id}/complete", json={
        "hours": 60,
        "policy": "UGC"
    }, headers=company_headers)
    assert resp.status_code == 200
    print(f"  Result: {resp.json()}")

    # 5. Approve
    print("\n>>> Institute Approving...")
    pending = requests.get(f"{BASE_URL}/institute/pending-credits", headers=institute_headers).json()
    if pending:
        req_id = pending[0]["id"]
        resp = requests.post(f"{BASE_URL}/institute/credit/{req_id}/approve", headers=institute_headers)
        assert resp.status_code == 200
        print("  Approved.")
    else:
        print("  No pending credits found (maybe already approved).")

    # 6. Check Dashboard
    print("\n>>> Checking Student Dashboard...")
    dash = requests.get(f"{BASE_URL}/student/dashboard", headers=student_headers).json()
    print(f"  Total Credits: {dash['total_credits']}")
    
    # 7. Check Exports
    print("\n>>> Checking Exports...")
    csv_resp = requests.get(f"{BASE_URL}/analytics/export/csv", headers=institute_headers)
    assert csv_resp.status_code == 200
    print("  CSV Downloaded.")

    print("\n>>> ALL TESTS PASSED SUCCESSFULLY! (FastAPI)")

if __name__ == "__main__":
    try:
        requests.get(BASE_URL)
    except:
        print("Server not running? Start with: uvicorn backend.main:app --reload")
        sys.exit(1)
    
    run_test()
