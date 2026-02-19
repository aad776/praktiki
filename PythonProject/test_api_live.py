
import requests
import sys
import os
import time

# Add the project root to sys.path
sys.path.append(os.path.join(os.getcwd(), "PythonProject"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.session import SessionLocal
from models.user import User
from models.student_profile import StudentProfile
from utils.security import get_password_hash

API_URL = "http://127.0.0.1:8001"
TEST_EMAIL = "test_api_verifier@example.com"
TEST_PASSWORD = "password123"

def setup_test_user():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == TEST_EMAIL).first()
        if not user:
            print("Creating test user...")
            user = User(
                email=TEST_EMAIL,
                full_name="Test API Verifier",
                hashed_password=get_password_hash(TEST_PASSWORD),
                role="student",
                is_email_verified=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            
            profile = StudentProfile(
                user_id=user.id,
                full_name="Test API Verifier",
                is_apaar_verified=True
            )
            db.add(profile)
            db.commit()
            print(f"Created user with ID: {user.id}")
        else:
            print(f"Using existing test user ID: {user.id}")
            
    except Exception as e:
        print(f"Error setting up test user: {e}")
        sys.exit(1)
    finally:
        db.close()

def test_login():
    try:
        response = requests.post(f"{API_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "role": "student"
        })
        
        if response.status_code == 200:
            print("✅ Login successful")
            return response.json()["access_token"]
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Error connecting to API: {e}")
        sys.exit(1)

def test_internships(token):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        # Request with high limit
        response = requests.get(f"{API_URL}/students/internships?limit=1000", headers=headers)
        
        if response.status_code == 200:
            internships = response.json()
            count = len(internships)
            print(f"✅ Internships fetched successfully. Count: {count}")
            
            if count >= 400:
                print("✅ Count is >= 400 (Success Criteria Met)")
            else:
                print(f"⚠️ Count is {count}, expected ~400. (Check DB data)")
                
        else:
            print(f"❌ Internships fetch failed: {response.status_code} - {response.text}")
            
    except Exception as e:
        print(f"❌ Error fetching internships: {e}")

def test_resume(token):
    headers = {"Authorization": f"Bearer {token}"}

    # Check Resume
    try:
        response = requests.get(f"{API_URL}/students/me/resume", headers=headers)
        if response.status_code == 200:
            print("✅ Resume endpoint works (200 OK)")
            print(f"Resume data: {response.json()}")
        elif response.status_code == 404:
             print("⚠️ Resume not found (404) - This is expected if user has no resume, but endpoint is reachable.")
        else:
            print(f"❌ Resume endpoint failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error testing resume: {e}")

    # Check Applications
    print("\n--- Testing Applications Endpoint ---")
    try:
        response = requests.get(f"{API_URL}/students/my-applications", headers=headers)
        if response.status_code == 200:
            apps = response.json()
            print(f"✅ Applications endpoint works (200 OK). Count: {len(apps)}")
            if len(apps) > 0:
                print(f"Sample Application: {apps[0]}")
        else:
            print(f"❌ Applications endpoint failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error testing applications: {e}")

if __name__ == "__main__":
    print("--- Setting up Test User ---")
    setup_test_user()
    
    print("\n--- Testing Login ---")
    token = test_login()
    
    print("\n--- Testing Internships Endpoint ---")
    test_internships(token)
    
    print("\n--- Testing Resume Endpoint ---")
    test_resume(token)
