from app.schemas import StructuredCreditData, EligibilityStatus
import json

def process_credit_request(data: StructuredCreditData) -> int:
    """
    Processes the structured credit object and returns calculated credits.
    """
    if data.eligibility_status != EligibilityStatus.ELIGIBLE:
        return 0
        
    # Example logic: 1 credit per 40 hours of internship
    # Max 4 credits per certificate
    base_credits = (data.total_hours or 0) // 40
    calculated_credits = min(base_credits, 4)
    
    # Logic can be expanded based on authenticity, performance, etc.
    print(f"Processing credits for student {data.student_id} from {data.organization_name}")
    print(f"Internship Title: {data.internship_title}")
    print(f"Performance: {data.performance_remark}")
    
    return calculated_credits
