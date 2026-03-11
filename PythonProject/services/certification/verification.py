from sqlalchemy import and_, or_, func
from sqlalchemy.orm import Session
from models.certificate import Certificate
from schemas.certificate import VerificationStatus, EligibilityStatus
from models.user import User
from thefuzz import fuzz
from datetime import date, datetime
from typing import Dict, Any, List
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_verification_workflow(db: Session, cert: Certificate, student: User, ai_results: Dict[str, Any]) -> Certificate:
    """
    Executes the simplified real-world verification workflow:
    1. Identity Check
    2. Duration & Organization Check
    3. Final Verification Status
    4. Eligibility Validation
    """
    
    # 1. Identity Check
    extracted_name = ai_results.get("student_name", "")
    # Identity match is optional but recommended
    cert.identity_verified = verify_identity(extracted_name, student.full_name, "", None, cert.id)
    
    # 2. Update fields from AI results
    cert.internship_title = ai_results.get("internship_title")
    cert.duration_in_months = ai_results.get("duration_in_months")
    cert.total_hours = ai_results.get("total_hours")
    cert.organization_name = ai_results.get("organization_name")
    cert.performance_remark = ai_results.get("performance_remark")
    
    # 3. Final Verification Status
    # Auto-verified if has QR, Identity matches, and Duration is present
    has_duration = cert.duration_in_months is not None or cert.total_hours is not None
    
    if cert.qr_detected and cert.identity_verified and has_duration:
        cert.verification_status = VerificationStatus.VERIFIED
    elif not cert.identity_verified or not has_duration:
        cert.verification_status = VerificationStatus.FLAGGED
    else:
        cert.verification_status = VerificationStatus.PENDING
        
    # 4. Eligibility Validation
    cert.eligibility_status = evaluate_credit_eligibility(cert)
    
    # 5. Build Verification Summary for UI
    cert.verification_summary = {
        "identity": {
            "status": "PASS" if cert.identity_verified else "FAIL",
            "details": f"Extracted name: {extracted_name}"
        },
        "duration": {
            "status": "PASS" if has_duration else "FAIL",
            "months": cert.duration_in_months,
            "total_hours": cert.total_hours
        },
        "organization": {
            "status": "PASS" if cert.organization_name else "FAIL",
            "name": cert.organization_name
        },
        "eligibility": {
            "status": cert.eligibility_status,
            "can_request_credits": cert.eligibility_status == EligibilityStatus.ELIGIBLE
        }
    }
    
    return cert

def verify_identity(extracted_name: str, registered_name: str, extracted_id: str, registered_id: str, cert_id: str = "unknown") -> bool:
    """
    Validates identity by comparing extracted name with registered name.
    Uses fuzzy matching with a 90% threshold.
    """
    if not extracted_name:
        logger.warning(f"IDENTITY_MISMATCH: No student name extracted for certificate {cert_id}")
        return False

    # Fuzzy matching for name
    name_score = fuzz.ratio(extracted_name.lower(), registered_name.lower())
    
    if name_score >= 90:
        logger.info(f"IDENTITY_VERIFIED: Certificate {cert_id} name match score: {name_score}%")
        return True
    
    # Log mismatch for admin review as requested
    logger.warning(
        f"IDENTITY_MISMATCH: Certificate {cert_id} - "
        f"Extracted Name: '{extracted_name}', Registered Name: '{registered_name}', "
        f"Match Score: {name_score}%"
    )
    
    # Log secondary ID match if present, even if name mismatch flags it
    if extracted_id and registered_id and extracted_id.strip() == registered_id.strip():
        logger.info(f"IDENTITY_NOTE: Certificate {cert_id} has matching ID '{extracted_id}' despite name mismatch")
        
    # User instruction: If name match < 90%, identity_verified = False (leads to FLAGGED)
    return False

def check_timeline_conflict(db: Session, student_id: str, start_date: date, end_date: date, exclude_cert_id: str = None) -> bool:
    """
    Checks if the given internship dates overlap with any existing certificates for the same student.
    Overlap condition: (start_date <= existing_end) AND (end_date >= existing_start)
    """
    if not start_date or not end_date:
        return False
        
    query = db.query(Certificate).filter(
        and_(
            Certificate.student_id == student_id,
            Certificate.start_date <= end_date,
            Certificate.end_date >= start_date
        )
    )
    
    if exclude_cert_id:
        query = query.filter(Certificate.id != exclude_cert_id)
        
    conflict = query.first()
    
    if conflict:
        logger.warning(
            f"TIMELINE_CONFLICT: New certificate for student {student_id} "
            f"({start_date} to {end_date}) overlaps with existing certificate {conflict.id} "
            f"({conflict.start_date} to {conflict.end_date})"
        )
        return True
        
    return False

def evaluate_credit_eligibility(cert: Certificate) -> EligibilityStatus:
    """
    Validates real-world certificate eligibility based on:
    - Identity verification (MUST be True)
    - Total Hours (MUST be >= minimum threshold, e.g., 160)
    - Authenticity score (threshold >= 0.6)
    """
    MIN_HOURS = 160 # Threshold for 1 month
    AUTH_THRESHOLD = 0.6
    
    # 1. Identity Check
    if not cert.identity_verified:
        return EligibilityStatus.FLAGGED
        
    # 2. Authenticity Check
    if cert.authenticity_score < AUTH_THRESHOLD:
        return EligibilityStatus.FLAGGED
        
    # 3. Hours/Duration Check
    if not cert.total_hours or cert.total_hours < MIN_HOURS:
        return EligibilityStatus.REJECTED
        
    return EligibilityStatus.ELIGIBLE
