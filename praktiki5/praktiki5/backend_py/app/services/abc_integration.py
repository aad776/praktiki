
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import CreditRequest, AcademicCreditLedger
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class ABCIntegrationService:
    """
    Service for Academic Bank of Credits (ABC) integration.
    Handles the generation and storage of structured academic records.
    """

    @staticmethod
    def calculate_credit_value(total_hours: int) -> float:
        """
        Academic Rule: 
        - 1 Credit = 30-40 hours of practical work (standard UGC/AICTE guidelines)
        - We use 40 hours per credit for consistency.
        """
        if not total_hours or total_hours <= 0:
            return 0.0
        
        # Calculate credits (max 4 per internship usually)
        credits = round(total_hours / 40.0, 1)
        return min(credits, 4.0)

    @classmethod
    async def create_academic_ledger_entry(
        cls, 
        db: AsyncSession, 
        credit_request: CreditRequest
    ) -> AcademicCreditLedger:
        """
        Generates a structured academic record and stores it in the Ledger.
        Architecture is ready for future external API calls to ABC systems.
        """
        try:
            # 1. Calculate credit value based on rules
            credit_val = cls.calculate_credit_value(credit_request.total_hours)
            
            # 2. Construct the structured academic record object
            # Note: student_id and other fields are already snapshot in credit_request
            ledger_entry = AcademicCreditLedger(
                student_id=credit_request.student_id,
                credit_request_id=credit_request.id,
                institute_id="INST-ABC-999", # Future-ready: pull from institute profile
                internship_title=credit_request.internship_title,
                total_hours=credit_request.total_hours,
                credit_value=credit_val,
                approval_timestamp=datetime.utcnow(),
                abc_transaction_id=f"TXN-{uuid.uuid4().hex[:8].upper()}", # Ready for API tracking
                is_synced_to_abc=False # Placeholder for future API sync
            )
            
            db.add(ledger_entry)
            logger.info(f"Academic Ledger entry created for request {credit_request.id} with {credit_val} credits")
            return ledger_entry
            
        except Exception as e:
            logger.error(f"Failed to create ABC ledger entry: {e}")
            raise
