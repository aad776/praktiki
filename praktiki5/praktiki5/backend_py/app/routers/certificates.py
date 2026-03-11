from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, func
from app.database import get_db
from app.models import Certificate, Student, TaxonomySkill
from app.schemas import CertificateCreate, CertificateResponse, VerificationStatus, EligibilityStatus
from app.auth import decode_access_token
from typing import List, Dict, Any
import shutil
import os
import json
from datetime import datetime, date
from app.services import ocr, qr, ai, verification, certificate_verification_service, audit_service
from app.utils import get_current_user
import uuid

router = APIRouter(prefix="/api/certificates", tags=["Certificates"])

def parse_date(date_str: Any) -> Any:
    if not date_str or not isinstance(date_str, str):
        return None
    try:
        return datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
    except ValueError:
        return None

@router.post("/upload", response_model=CertificateResponse)
async def upload_certificate(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: Student = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Ensure uploads directory exists
    os.makedirs("uploads", exist_ok=True)
    
    file_extension = file.filename.split(".")[-1]
    file_path = f"uploads/{uuid.uuid4()}.{file_extension}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Use the enhanced certificate verification service
    verification_data, new_cert = await certificate_verification_service.process_certificate_verification(
        db=db,
        file_path=file_path,
        student_id=current_user.id
    )
    
    # Run Simplified Real-World Verification Workflow
    new_cert = await verification.run_verification_workflow(
        db=db, 
        cert=new_cert, 
        student=current_user, 
        ai_results=verification_data["ai_extracted_data"]
    )
    
    db.add(new_cert)
    await db.flush() # Ensure ID is generated for audit log
    
    # Create Audit Log for Upload
    await audit_service.AuditService.log_action(
        db=db,
        action_type="UPLOAD",
        performed_by_id=current_user.id,
        performed_by_role=current_user.role,
        reference_id=new_cert.id,
        details={
            "filename": file.filename,
            "organization": new_cert.organization_name,
            "title": new_cert.internship_title
        }
    )
    
    await db.commit()
    await db.refresh(new_cert)
    
    return new_cert

@router.get("/", response_model=List[CertificateResponse])
async def get_certificates(
    current_user: Student = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role == "student":
        result = await db.execute(select(Certificate).where(Certificate.student_id == current_user.id))
    else:
        # Admin/Institute sees all
        result = await db.execute(select(Certificate).join(Student))
        
    return result.scalars().all()
