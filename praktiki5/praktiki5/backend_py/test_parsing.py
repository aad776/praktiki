
import os
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import AsyncSessionLocal
from app.models import Student
from app.services import certificate_verification_service, verification
from app.auth import get_password_hash
from sqlalchemy import select
import json

async def test_parsing():
    async with AsyncSessionLocal() as db:
        # 1. Ensure we have a test student
        result = await db.execute(select(Student).where(Student.email == "test@example.com"))
        student = result.scalars().first()
        if not student:
            student = Student(
                name="John Doe",
                email="test@example.com",
                password_hash=get_password_hash("password123"),
                role="student"
            )
            db.add(student)
            await db.commit()
            await db.refresh(student)
            print(f"Created test student: {student.name}")
        else:
            print(f"Using existing student: {student.name}")

        # 2. Path to a certificate file (assuming one exists in uploads or tp)
        # For testing, we can use a dummy file or a real one if available
        test_file = "test_cert.txt"
        with open(test_file, "w") as f:
            f.write("""
            CERTIFICATE OF COMPLETION
            Presented to
            John Doe
            for successfully completing the
            Python Web Development Internship
            at
            Tech Solutions Inc.
            Duration: 160 hours
            Dates: 2023-01-01 to 2023-02-01
            Certificate ID: CERT-123456
            """)
        
        print(f"Processing test file: {test_file}")
        
        # 3. Process the certificate
        verification_data, new_cert = await certificate_verification_service.process_certificate_verification(
            db=db,
            file_path=test_file,
            student_id=student.id
        )
        
        # 4. Run verification workflow
        new_cert = await verification.run_verification_workflow(
            db=db, 
            cert=new_cert, 
            student=student, 
            ai_results=verification_data["ai_extracted_data"]
        )
        
        print("\n--- Extraction Results ---")
        print(f"Student Name: {new_cert.student.name if hasattr(new_cert, 'student') and new_cert.student else 'N/A'}")
        print(f"Extracted Name: {verification_data['ai_extracted_data'].get('student_name')}")
        print(f"Organization: {new_cert.organization_name}")
        print(f"Title: {new_cert.internship_title}")
        print(f"Hours: {new_cert.total_hours}")
        print(f"Duration (Months): {new_cert.duration_in_months}")
        print(f"Start Date: {new_cert.start_date}")
        print(f"End Date: {new_cert.end_date}")
        print(f"Verification Status: {new_cert.verification_status}")
        print(f"Identity Verified: {new_cert.identity_verified}")
        
        # Clean up
        if os.path.exists(test_file):
            os.remove(test_file)

if __name__ == "__main__":
    asyncio.run(test_parsing())
