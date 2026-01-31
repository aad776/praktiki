from datetime import datetime
from math import exp
from app.feedback.feedback_store import get_feedback_events

# tuning knobs
HALF_LIFE_DAYS = 7          # feedback loses half power every 7 days
MAX_TOTAL_BOOST = 12        # safety cap


def time_decay(days_old: float) -> float:
    """
    Exponential decay
    """
    return exp(-days_old / HALF_LIFE_DAYS)


def compute_feedback_boost(student_id: int, internship_id: int) -> float:
    events = get_feedback_events(student_id, internship_id)
    now = datetime.utcnow()

    total_boost = 0.0

    for score, timestamp in events:
        age_days = (now - timestamp).total_seconds() / (3600 * 24)
        total_boost += score * time_decay(age_days)

    # safety clamp
    return round(min(total_boost, MAX_TOTAL_BOOST), 2)
