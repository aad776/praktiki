from sqlalchemy.orm import Session
from backend.models.credit import AuditLog

def create_audit_log(db: Session, action: str, user_id: int, details: str):
    log = AuditLog(action=action, performed_by_id=user_id, details=details)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

