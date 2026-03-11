from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import CreditRequest, Student, Certificate
from app.auth import decode_access_token
from app.utils import get_current_user
from fastapi.responses import FileResponse
import csv
import os

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/export-csv")
async def export_abc_csv(
    current_user: Student = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
        
    result = await db.execute(select(CreditRequest).join(Certificate).join(Student))
    credit_requests = result.scalars().all()
    
    file_path = "abc_export.csv"
    with open(file_path, "w", newline="") as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(["Student Name", "Email", "Certificate ID", "Credits", "Status"])
        for req in credit_requests:
            writer.writerow([req.certificate.student.name, req.certificate.student.email, req.certificate.id, req.requested_credits, req.status])
            
    return FileResponse(file_path, filename="abc_export.csv", media_type="text/csv")
