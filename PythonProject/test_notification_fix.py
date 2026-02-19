
import unittest
from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from db.session import SessionLocal
from models.notification import Notification
from models.user import User

class TestNotificationFix(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_notification_user_id_column_exists(self):
        """Test that user_id column exists in notifications table"""
        inspector = inspect(self.db.get_bind())
        columns = [c['name'] for c in inspector.get_columns('notifications')]
        self.assertIn('user_id', columns, "user_id column is missing in notifications table")

    def test_insert_notification_with_user_id(self):
        """Test inserting a notification with user_id does not raise OperationalError"""
        # Create or get a user
        user = self.db.query(User).filter(User.email == "test_unit_notif@example.com").first()
        if not user:
            user = User(
                email="test_unit_notif@example.com", 
                hashed_password="hashed_password", 
                role="student",
                is_email_verified=True,
                full_name="Test Unit User"
            )
            self.db.add(user)
            self.db.commit()
            self.db.refresh(user)

        # Create notification
        try:
            notif = Notification(
                user_id=user.id,
                message="Unit Test Notification",
                is_read=0
            )
            self.db.add(notif)
            self.db.commit()
            self.db.refresh(notif)
            
            # Verify it exists
            fetched = self.db.query(Notification).filter(Notification.id == notif.id).first()
            self.assertIsNotNone(fetched)
            self.assertEqual(fetched.user_id, user.id)
            
            # Cleanup
            self.db.delete(notif)
            self.db.commit()
            
        except Exception as e:
            self.fail(f"Insertion failed with exception: {e}")

if __name__ == '__main__':
    unittest.main()
