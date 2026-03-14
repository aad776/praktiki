
import sys
import os
sys.path.append(os.getcwd())
from backend.database import engine, Base
from backend.models.user import User, StudentProfile, EmployerProfile
from backend.models.internship import Internship, Application
from backend.models.credit import CreditRequest, AuditLog
from backend.models.notification import Notification

print("Creating tables...")
Base.metadata.create_all(bind=engine)
print("Tables created.")
