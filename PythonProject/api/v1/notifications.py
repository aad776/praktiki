from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from db.session import get_db
from models.user import User
from models.notification import Notification
from utils.dependencies import get_current_user
from typing import List
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

class NotificationOut(BaseModel):
    id: int
    message: str
    created_at: datetime
    is_read: int

    class Config:
        orm_mode = True

@router.get("/", response_model=List[NotificationOut])
def get_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notifications = db.query(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(Notification.created_at.desc()).all()
    return notifications

@router.post("/{notification_id}/read")
def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(
        Notification.id == notification_id,
        Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = 1
    db.commit()
    return {"message": "Notification marked as read"}

@router.post("/mark-all-read")
def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        Notification.user_id == current_user.id,
        Notification.is_read == 0
    ).update({Notification.is_read: 1})
    db.commit()
    return {"message": "All notifications marked as read"}
