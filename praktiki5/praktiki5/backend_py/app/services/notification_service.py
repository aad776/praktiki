
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import Notification
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Service for managing simple text-based notifications.
    """

    @staticmethod
    async def create_notification(
        db: AsyncSession,
        user_id: str,
        message: str
    ):
        """
        Create a new notification for a user.
        """
        try:
            notification = Notification(
                user_id=user_id,
                message=message
            )
            db.add(notification)
            logger.info(f"Notification created for user {user_id}: {message}")
            return notification
        except Exception as e:
            logger.error(f"Failed to create notification: {e}")
            # Non-critical failure
            pass
