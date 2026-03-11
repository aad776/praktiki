
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import AuditLog
import logging
import json

logger = logging.getLogger(__name__)

class AuditService:
    """
    Service for managing immutable audit logs.
    Ensures a permanent record of all critical system actions.
    """

    @staticmethod
    async def log_action(
        db: AsyncSession,
        action_type: str,
        performed_by_id: str,
        performed_by_role: str,
        reference_id: str,
        details: dict = None
    ):
        """
        Create a new audit log entry. 
        This is a low-level method used by routers and services.
        """
        try:
            new_log = AuditLog(
                action_type=action_type,
                performed_by=performed_by_id,
                performed_by_role=performed_by_role,
                reference_id=reference_id,
                details=details
            )
            db.add(new_log)
            # Note: We don't commit here, we rely on the parent transaction to commit.
            # This ensures if the main action fails, the log isn't created either.
            logger.info(f"Audit log created: {action_type} by {performed_by_role} ({performed_by_id}) for ref {reference_id}")
            return new_log
        except Exception as e:
            logger.error(f"Failed to create audit log: {e}")
            # We don't want to crash the whole request if logging fails, 
            # but in a high-security audit system we might.
            pass
