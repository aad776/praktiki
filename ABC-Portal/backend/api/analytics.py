from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models.user import User
from backend.models.credit import CreditRequest
from backend.core.security import get_current_user
import csv
import io
from reportlab.pdfgen import canvas
from datetime import datetime
from typing import Optional
from backend.services.analytics_service import institute_dashboard

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/institute")
def institute_analytics(
    startDate: Optional[str] = None, 
    endDate: Optional[str] = None, 
    policy: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return institute_dashboard(db, startDate, endDate, policy, user=current_user)

@router.get("/export/csv")
def export_csv(
    startDate: Optional[str] = None, 
    endDate: Optional[str] = None, 
    policy: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student ID", "Credits", "Policy", "Status", "Updated At"])
    
    query = db.query(CreditRequest)
    
    if startDate:
        query = query.filter(CreditRequest.updated_at >= datetime.strptime(startDate, '%Y-%m-%d'))
    if endDate:
        query = query.filter(CreditRequest.updated_at <= datetime.strptime(endDate, '%Y-%m-%d'))
    if policy and policy != 'ALL':
        query = query.filter(CreditRequest.policy_type == policy)
        
    requests = query.all()
    for req in requests:
        writer.writerow([req.student_id, req.credits_calculated, req.policy_type, req.status, req.updated_at])
    
    return Response(content=output.getvalue(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=credits.csv"})

@router.get("/export/pdf")
def export_pdf(
    startDate: Optional[str] = None, 
    endDate: Optional[str] = None, 
    policy: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "institute":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer)
    p.drawString(100, 800, "Credit Report")
    
    # Add filter info
    filter_text = f"Filters: {startDate or 'Any'} to {endDate or 'Any'} | Policy: {policy or 'All'}"
    p.setFont("Helvetica", 10)
    p.drawString(100, 780, filter_text)
    
    y = 750
    p.setFont("Helvetica", 12)
    
    query = db.query(CreditRequest)
    
    if startDate:
        query = query.filter(CreditRequest.updated_at >= datetime.strptime(startDate, '%Y-%m-%d'))
    if endDate:
        query = query.filter(CreditRequest.updated_at <= datetime.strptime(endDate, '%Y-%m-%d'))
    if policy and policy != 'ALL':
        query = query.filter(CreditRequest.policy_type == policy)
        
    requests = query.all()
    for req in requests:
        p.drawString(100, y, f"Student: {req.student_id} | Credits: {req.credits_calculated} | Policy: {req.policy_type} | Status: {req.status}")
        y -= 20
        if y < 50:
            p.showPage()
            y = 800
            
    p.save()
    return Response(content=buffer.getvalue(), media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=report.pdf"})
