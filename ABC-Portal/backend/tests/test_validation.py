from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.main import app
from backend.database import Base, get_db
from backend.models.user import User
# import pytest

# Setup Test Database
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_validation.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

# Helper to create user and get token
def get_auth_headers(username, role, email):
    # Register
    client.post("/auth/register", json={
        "username": username,
        "email": email,
        "password": "password",
        "role": role,
        "institute_name": "Test Inst" if role == "student" else None
    })
    
    # Manually verify in DB
    db = TestingSessionLocal()
    user = db.query(User).filter(User.username == username).first()
    user.is_verified = True
    db.commit()
    db.close()
    
    # Login
    response = client.post("/auth/login", data={"username": email, "password": "password"})
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_validation_logic():
    # 1. Setup Company and Student
    company_headers = get_auth_headers("comp_val", "company", "comp_val@test.com")
    student_headers = get_auth_headers("stud_val", "student", "stud_val@test.com")
    
    # 2. Post Internship
    res = client.post("/company/internship", 
                      json={"title": "Test Intern", "description": "Desc"},
                      headers=company_headers)
    assert res.status_code == 200
    
    # 3. Apply
    internship_id = 1
    res = client.post("/student/apply", json={"internship_id": internship_id}, headers=student_headers)
    assert res.status_code == 200
    app_id = 1
    
    # 4. Test UGC < 60 (Should Auto Reject)
    res = client.post(f"/company/application/{app_id}/complete",
                      json={"hours": 59, "policy": "UGC"},
                      headers=company_headers)
    
    assert res.status_code == 200 # It returns 200 but with rejection message
    assert "automatically rejected" in res.json()["message"]
    assert "UGC" in res.json()["message"]
    
    # Reset status for next test (Manually in DB or just apply again)
    # Applying again might be blocked if already exists? Let's create new internship/application
    
    # New Internship for AICTE test
    client.post("/company/internship", 
                json={"title": "Test Intern 2", "description": "Desc"},
                headers=company_headers)
    client.post("/student/apply", json={"internship_id": 2}, headers=student_headers)
    app_id_2 = 2
    
    # 5. Test AICTE < 80 (Should Auto Reject)
    res = client.post(f"/company/application/{app_id_2}/complete",
                      json={"hours": 79, "policy": "AICTE"},
                      headers=company_headers)
    
    assert res.status_code == 200
    assert "automatically rejected" in res.json()["message"]
    assert "AICTE" in res.json()["message"]
    assert "Minimum 2 credits are necessary" in res.json()["message"]

    # 6. Test Valid UGC (>= 60)
    # New Internship
    client.post("/company/internship", 
                json={"title": "Test Intern 3", "description": "Desc"},
                headers=company_headers)
    client.post("/student/apply", json={"internship_id": 3}, headers=student_headers)
    app_id_3 = 3
    
    res = client.post(f"/company/application/{app_id_3}/complete",
                      json={"hours": 60, "policy": "UGC"},
                      headers=company_headers)
    assert res.status_code == 200
    assert "submitted for Admin review" in res.json()["message"]

    print("All validation tests passed!")

if __name__ == "__main__":
    test_validation_logic()
