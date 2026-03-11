
import json
import time
import logging
from typing import Tuple, Dict, Any
import os
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Certificate
from app.services import qr, ocr, ai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def process_certificate_verification(
    db: AsyncSession, 
    file_path: str, 
    student_id: str
) -> Tuple[Dict[str, Any], Certificate]:
    """
    Main certificate verification service with performance and reliability optimizations.
    """
    start_time = time.time()
    verification_data = {}
    extracted_results = {}
    ocr_text = ""
    qr_detected = False
    qr_data = None
    authenticity_score = 0.5
    
    try:
        # 1. QR Code Detection (Fastest, check first)
        qr_start = time.time()
        qr_detected, qr_data = await detect_and_process_qr(file_path)
        logger.info(f"QR detection took: {time.time() - qr_start:.2f}s")
        
        # 2. Text Extraction (Handles PDF, DOCX, Image, TXT via ocr.py)
        ocr_start = time.time()
        ocr_text = ocr.extract_text(file_path) or ""
        logger.info(f"OCR extraction took: {time.time() - ocr_start:.2f}s")
        
        # 3. Data Extraction - Intelligent Strategy
        # Always try rule-based extraction first (it's very fast and improved)
        tp_start = time.time()
        extracted_results = ocr.extract_structured_data_from_ocr(ocr_text)
        logger.info(f"TP Rule-based extraction took: {time.time() - tp_start:.2f}s")
        
        # Only use AI if rule-based is missing critical fields or has low confidence
        critical_fields = ["student_name", "organization_name", "total_hours"]
        missing_critical = any(not extracted_results.get(field) for field in critical_fields)
        low_confidence = extracted_results.get("extraction_confidence", 0) < 0.7
        
        if missing_critical or low_confidence:
            logger.info("Rule-based results incomplete or low confidence. Attempting AI extraction...")
            try:
                ai_start = time.time()
                ai_tp_results = ai.extract_info(ocr_text)
                logger.info(f"AI extraction took: {time.time() - ai_start:.2f}s")
                
                if ai_tp_results and "error" not in ai_tp_results:
                    # Merge: AI results take priority for missing fields
                    ai_mapped = {
                        "student_name": ai_tp_results.get('name', {}).get('value'),
                        "organization_name": ai_tp_results.get('organization', {}).get('value'),
                        "internship_title": ai_tp_results.get('internship_title', {}).get('value'),
                        "total_hours": _safe_int(ai_tp_results.get('hours', {}).get('value')),
                        "start_date": ai_tp_results.get('start_date', {}).get('value'),
                        "end_date": ai_tp_results.get('end_date', {}).get('value'),
                        "performance_remark": ai_tp_results.get('performance_remark', {}).get('value'),
                        "extraction_confidence": _calculate_average_confidence(ai_tp_results),
                        "extraction_method": "ai_enhanced"
                    }
                    
                    for k, v in ai_mapped.items():
                        if v and (not extracted_results.get(k) or k == "extraction_confidence" or k == "extraction_method"):
                            extracted_results[k] = v
            except Exception as ai_error:
                logger.error(f"AI TP Extraction failed: {ai_error}")

    except Exception as e:
        logger.error(f"Certificate verification error: {e}")
        extracted_results = {
            "extraction_method": "error_fallback",
            "extraction_confidence": 0.0,
            "error": str(e)
        }
    
    # 4. Calculate Authenticity Score
    authenticity_score = calculate_authenticity_score(qr_detected, extracted_results, ocr_text)
    
    # 5. Post-processing: Duration check
    if extracted_results.get("total_hours"):
        extracted_results["duration_in_months"] = int(extracted_results["total_hours"]) // 160 or 1
    elif extracted_results.get("start_date") and extracted_results.get("end_date"):
        extracted_results["duration_in_months"] = _calculate_months(extracted_results["start_date"], extracted_results["end_date"])
    
    logger.info(f"Total processing time: {time.time() - start_time:.2f}s")

    # 6. Create verification metadata
    verification_data = {
        "qr_detected": qr_detected,
        "qr_data": qr_data,
        "authenticity_score": authenticity_score,
        "ocr_text": ocr_text,
        "ai_extracted_data": extracted_results,
        "processing_success": "error" not in extracted_results,
        "processing_time": f"{time.time() - start_time:.2f}s"
    }
    
    # 7. Create Certificate object
    certificate = Certificate(
        student_id=student_id,
        file_url=file_path,
        qr_detected=qr_detected,
        has_qr=qr_detected,
        authenticity_score=authenticity_score,
        extracted_data=json.dumps(extracted_results),
        organization_name=extracted_results.get("organization_name"),
        internship_title=extracted_results.get("internship_title"),
        duration_in_months=extracted_results.get("duration_in_months"),
        total_hours=extracted_results.get("total_hours"),
        performance_remark=extracted_results.get("performance_remark"),
        start_date=parse_date(extracted_results.get("start_date")),
        end_date=parse_date(extracted_results.get("end_date"))
    )
    
    return verification_data, certificate


async def detect_and_process_qr(file_path: str) -> Tuple[bool, str | None]:
    """Enhanced QR detection"""
    try:
        qr_detected, qr_data = qr.scan_qr(file_path)
        return qr_detected, qr_data
    except Exception as e:
        print(f"QR Processing Error: {e}")
        return False, None


def calculate_authenticity_score(qr_detected: bool, extracted_results: Dict[str, Any], ocr_text: str = "") -> float:
    """Calculate authenticity score based on TP-style metrics"""
    
    # Base score
    score = extracted_results.get("extraction_confidence", 0.5)
    
    # QR Bonus
    if qr_detected:
        score = min(1.0, score + 0.3)
        
    # Completeness Check
    required_fields = ["student_name", "organization_name", "start_date", "end_date"]
    present_fields = sum(1 for field in required_fields if extracted_results.get(field))
    completeness_bonus = (present_fields / len(required_fields)) * 0.2
    
    score = min(1.0, score + completeness_bonus)
    
    return round(score, 2)


def parse_date(date_str: Any) -> Any:
    """Helper function to parse date strings"""
    if not date_str or not isinstance(date_str, str):
        return None
    try:
        from datetime import datetime
        # TP returns YYYY-MM-DD
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except:
        try:
            return datetime.fromisoformat(date_str.replace('Z', '+00:00')).date()
        except:
            return None


def _safe_int(val):
    try:
        if not val: return None
        return int(val)
    except:
        return None

def _calculate_average_confidence(tp_data):
    if not tp_data: return 0.0
    confs = [v.get('conf', 0.0) for v in tp_data.values() if isinstance(v, dict)]
    if not confs: return 0.0
    return round(sum(confs) / len(confs), 2)

def _calculate_months(start_str, end_str):
    try:
        from datetime import datetime
        start = datetime.strptime(start_str, '%Y-%m-%d')
        end = datetime.strptime(end_str, '%Y-%m-%d')
        diff = end - start
        return max(1, diff.days // 30)
    except:
        return None

async def process_certificate_verification_async(
    db: AsyncSession, 
    file_path: str, 
    student_id: str
) -> Dict[str, Any]:
    """Asynchronous background processing"""
    verification_data, certificate = await process_certificate_verification(
        db, file_path, student_id
    )
    db.add(certificate)
    await db.commit()
    await db.refresh(certificate)
    verification_data["certificate_id"] = certificate.id
    return verification_data
