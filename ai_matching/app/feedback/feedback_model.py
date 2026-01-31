from dataclasses import dataclass
from datetime import datetime


@dataclass
class MatchFeedback:
    student_id: int
    internship_id: int
    student_action: str   # applied | ignored
    company_action: str   # shortlisted | rejected
    timestamp: str = datetime.utcnow().isoformat()

from pydantic import BaseModel



class FeedbackEvent(BaseModel):
    student_id: int
    internship_id: int
    action: str  # view, click, apply, ignore
    timestamp: datetime = datetime.utcnow()
