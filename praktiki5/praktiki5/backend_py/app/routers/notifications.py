
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models import Notification, Student
from app.schemas import NotificationResponse
from app.utils import get_current_user
from typing import List

router = APIRouter(prefix="/api/notifications", tags=["Notifications"])

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    current_user: Student = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch all notifications for the current user, latest first.
    """
    query = select(Notification).where(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc())
    
    result = await db.execute(query)
    return result.scalars().all()

@router.put("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    current_user: Student = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a specific notification as read.
    """
    notification = await db.get(Notification, notification_id)
    if not notification or notification.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.read_status = True
    await db.commit()
    return {"message": "Notification marked as read"}

@router.put("/read-all")
async def mark_all_as_read(
    current_user: Student = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark all notifications for the current user as read.
    """
    query = update(Notification).where(
        Notification.user_id == current_user.id
    ).values(read_status=True)
    
    await db.execute(query)
    await db.commit()
    return {"message": "All notifications marked as read"}
