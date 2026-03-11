from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import CreditRequest, Certificate, Student
from app.schemas import CreditRequestCreate, CreditRequestResponse, EligibilityStatus, VerificationStatus, StructuredCreditData, CreditStatus, CreditReviewRequest, StudentCreditRequestView
from app.utils import get_current_user
from datetime import datetime
from app.services import credit_engine, abc_integration, audit_service, notification_service
import json

router = APIRouter(prefix="/api/credits", tags=["Credits"])

@router.get("/student/requests", response_model=list[StudentCreditRequestView])
async def get_student_credit_requests(
    current_user: Student = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all credit requests for the logged-in student, sorted by latest first.
    """
    query = select(CreditRequest).where(
        CreditRequest.student_id == current_user.id
    ).order_by(CreditRequest.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/", response_model=CreditRequestResponse)
async def request_credit(
    request: CreditRequestCreate,
    current_user: Student = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Verify Certificate belongs to User
    result = await db.execute(select(Certificate).where(Certificate.id == request.certificate_id))
    cert = result.scalars().first()
    
    if not cert or cert.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to request credit for this certificate")
        
    # Check Eligibility Status - MUST be ELIGIBLE to proceed
    if cert.eligibility_status != EligibilityStatus.ELIGIBLE:
        detail_msg = "Certificate is not eligible for credit requests."
        if cert.eligibility_status == EligibilityStatus.REJECTED:
            detail_msg = "Certificate rejected (does not meet criteria like minimum hours)."
        elif cert.eligibility_status == EligibilityStatus.FLAGGED:
            detail_msg = "Certificate flagged for manual review (identity mismatch or timeline conflict)."
        elif cert.eligibility_status == EligibilityStatus.NOT_CHECKED:
            detail_msg = "Certificate eligibility has not been evaluated yet."
            
        raise HTTPException(status_code=400, detail=detail_msg)

    # Create new CreditRequest entry with a snapshot of certificate data
    # This maintains clean separation of concerns and avoids direct exposure of Certificate table to Institute
    new_request = CreditRequest(
        student_id=current_user.id,
        certificate_id=cert.id,
        internship_title=cert.internship_title,
        organization_name=cert.organization_name,
        duration_in_months=cert.duration_in_months,
        total_hours=cert.total_hours,
        performance_remark=cert.performance_remark,
        authenticity_score=cert.authenticity_score,
        status=CreditStatus.PENDING
    )
    
    db.add(new_request)
    await db.flush() # Ensure ID is generated for audit log
    
    # Audit Log: REQUEST
    await audit_service.AuditService.log_action(
        db=db,
        action_type="REQUEST",
        performed_by_id=current_user.id,
        performed_by_role=current_user.role,
        reference_id=new_request.id,
        details={
            "certificate_id": cert.id,
            "organization": cert.organization_name,
            "title": cert.internship_title
        }
    )

    # Notification: REQUEST
    await notification_service.NotificationService.create_notification(
        db=db,
        user_id=current_user.id,
        message=f"Your credit request for '{cert.internship_title}' at '{cert.organization_name}' has been submitted successfully."
    )
    
    await db.commit()
    await db.refresh(new_request)
    
    return new_request

@router.get("/", response_model=list[CreditRequestResponse])
async def list_credit_requests(
    current_user: Student = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List credit requests. Students see their own, Admins (Institute) see all.
    """
    if current_user.role == "admin":
        query = select(CreditRequest)
    else:
        query = select(CreditRequest).where(CreditRequest.student_id == current_user.id)
        
    result = await db.execute(query)
    return result.scalars().all()

@router.put("/review/{request_id}", response_model=CreditRequestResponse)
async def review_credit_request(
    request_id: str,
    review: CreditReviewRequest,
    current_user: Student = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin (Institute) access required")
        
    credit_req = await db.get(CreditRequest, request_id)
    if not credit_req:
        raise HTTPException(status_code=404, detail="Credit request not found")
    
    # Lock record: Prevent modification if already APPROVED or REJECTED
    if credit_req.status in [CreditStatus.APPROVED, CreditStatus.REJECTED]:
        raise HTTPException(
            status_code=400, 
            detail=f"Record is locked. Current status is {credit_req.status} and cannot be modified."
        )
        
    # Transaction safe update
    try:
        credit_req.status = review.status
        credit_req.institute_comment = review.institute_comment
        credit_req.updated_at = datetime.utcnow()
        
        # ABC Integration Trigger: Generate Ledger Entry if Approved
        if review.status == CreditStatus.APPROVED:
            await abc_integration.ABCIntegrationService.create_academic_ledger_entry(db, credit_req)
        
        # Audit Log: APPROVE / REJECT
        action = "APPROVE" if review.status == CreditStatus.APPROVED else "REJECT"
        await audit_service.AuditService.log_action(
            db=db,
            action_type=action,
            performed_by_id=current_user.id,
            performed_by_role=current_user.role,
            reference_id=credit_req.id,
            details={
                "status": review.status,
                "comment": review.institute_comment
            }
        )

        # Notification: APPROVE / REJECT
        status_msg = "approved" if review.status == CreditStatus.APPROVED else "rejected"
        comment_suffix = f" Reason: {review.institute_comment}" if review.status == CreditStatus.REJECTED else ""
        await notification_service.NotificationService.create_notification(
            db=db,
            user_id=credit_req.student_id,
            message=f"Your credit request for '{credit_req.internship_title}' has been {status_msg}.{comment_suffix}"
        )
        
        await db.commit()
        await db.refresh(credit_req)
        return credit_req
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Database error during review: {str(e)}")
