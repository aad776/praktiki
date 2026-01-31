from collections import defaultdict
from datetime import datetime
from typing import List, Tuple

# feedback_events[(student_id, internship_id)] = [(score, timestamp), ...]
feedback_events = defaultdict(list)

ACTION_WEIGHTS = {
    "view": 1,
    "click": 2,
    "apply": 5,
    "ignore": -1
}


def record_feedback(student_id: int, internship_id: int, action: str):
    if action not in ACTION_WEIGHTS:
        return

    score = ACTION_WEIGHTS[action]
    timestamp = datetime.utcnow()
    feedback_events[(student_id, internship_id)].append((score, timestamp))


def get_feedback_events(student_id: int, internship_id: int) -> List[Tuple[int, datetime]]:
    return feedback_events.get((student_id, internship_id), [])


def get_feedback_score(student_id: int, internship_id: int) -> int:
    return sum(score for score, _ in feedback_events.get((student_id, internship_id), []))
