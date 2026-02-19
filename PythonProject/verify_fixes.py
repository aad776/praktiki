
import sys
import os
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from db.session import SessionLocal
from models.notification import Notification
from models.user import User
from models.application import Application
from models.internship import Internship
from models.employer_profile import EmployerProfile
from models.student_profile import StudentProfile
from schemas.students import ApplicationOut
from api.v1.students import get_my_applications
from fastapi import HTTPException

# Mock dependencies
class MockUser:
    def __init__(self, id, role, email, full_name):
        self.id = id
        self.role = role
        self.email = email
        self.full_name = full_name
        self.is_apaar_verified = False
        self.phone_number = None
        self.apaar_id = None

def verify_notification_fix(db):
    print("\n--- Verifying Notification Fix ---")
    try:
        # 1. Verify Schema via Inspection
        inspector = inspect(db.get_bind())
        columns = [c['name'] for c in inspector.get_columns('notifications')]
        print(f"Columns in notifications table: {columns}")
        
        if 'user_id' not in columns:
            print("❌ user_id column missing in notifications table!")
            return False
        
        print("✅ Schema check passed: user_id exists.")

        # 2. Verify Insert
        # Find a user to attach notification to
        user = db.query(User).first()
        if not user:
            print("⚠️ No users found. Creating a temporary user.")
            user = User(
                email="test_verify_user@example.com", 
                hashed_password="hashed_password", 
                role="student",
                is_email_verified=True,
                full_name="Test User"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        print(f"Using user ID: {user.id}")

        # Create notification
        notif = Notification(
            user_id=user.id,
            message="Test Notification for Schema Validation",
            is_read=0
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        
        print(f"✅ Insert check passed: Created notification ID {notif.id} for user {user.id}.")
        
        # Verify Query
        fetched_notif = db.query(Notification).filter(Notification.id == notif.id).first()
        assert fetched_notif is not None
        assert fetched_notif.user_id == user.id
        print("✅ Query check passed.")

        # Cleanup
        db.delete(notif)
        if user.email == "test_verify_user@example.com":
             db.delete(user)
        db.commit()
        print("✅ Notification Fix Verified.")
        return True
        
    except Exception as e:
        print(f"❌ Notification Fix Failed with Exception: {e}")
        import traceback
        traceback.print_exc()
        return False

def verify_application_fix(db):
    print("\n--- Verifying Application Fix ---")
    try:
        # Setup data
        user = db.query(User).filter(User.email == "test_app_user@example.com").first()
        if not user:
            user = User(
                email="test_app_user@example.com", 
                hashed_password="hashed_password", 
                role="student",
                is_email_verified=True,
                full_name="Test Student"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        profile = db.query(StudentProfile).filter(StudentProfile.user_id == user.id).first()
        if not profile:
            profile = StudentProfile(user_id=user.id)
            db.add(profile)
            db.commit()
            db.refresh(profile)

        employer_user = db.query(User).filter(User.email == "test_employer@example.com").first()
        if not employer_user:
            employer_user = User(
                email="test_employer@example.com", 
                hashed_password="hashed_password", 
                role="employer",
                is_email_verified=True,
                full_name="Test Employer"
            )
            db.add(employer_user)
            db.commit()
            db.refresh(employer_user)
        
        employer_profile = db.query(EmployerProfile).filter(EmployerProfile.user_id == employer_user.id).first()
        if not employer_profile:
            employer_profile = EmployerProfile(
            user_id=employer_user.id,
            company_name="Test Company",
            contact_number="1234567890",
            website_url="https://example.com"
        )
            db.add(employer_profile)
            db.commit()
            db.refresh(employer_profile)

        internship = Internship(
            employer_id=employer_profile.id,
            title="Test Internship",
            description="Test Description",
            location="Remote",
            mode="remote",
            duration_weeks=12,
            status="active"
        )
        db.add(internship)
        db.commit()
        db.refresh(internship)

        application = Application(
            student_id=profile.id,
            internship_id=internship.id,
            status="applied"
        )
        db.add(application)
        db.commit()
        db.refresh(application)

        print(f"Created Application ID: {application.id}")

        # Call get_my_applications logic
        mock_current_user = MockUser(user.id, "student", user.email, user.full_name)
        
        apps = get_my_applications(mock_current_user, db)
        
        print(f"Retrieved {len(apps)} applications")
        if len(apps) > 0:
            app = apps[0]
            print(f"Application ID: {app.id}")
            print(f"Internship Title: {app.internship.title if app.internship else 'None'}")
            print(f"Company Name: {app.internship.company_name if app.internship else 'None'}")
            
            if app.internship and app.internship.title == "Test Internship" and app.internship.company_name == "Test Company":
                print("✅ Application Fix Verified: Internship data is correctly populated.")
            else:
                print("❌ Application Fix Failed: Internship data missing or incorrect.")
        else:
             print("❌ Application Fix Failed: No applications retrieved.")

        # Cleanup
        db.delete(application)
        db.delete(internship)
        # Keep profiles/users to avoid FK issues or just leave them (test DB)
        db.commit()

    except Exception as e:
        print(f"❌ Application Fix Failed with Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    db = SessionLocal()
    try:
        verify_notification_fix(db)
        verify_application_fix(db)
    finally:
        db.close()
