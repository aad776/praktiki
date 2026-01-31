import json
from datetime import datetime
from pathlib import Path

LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

MATCH_LOG_FILE = LOG_DIR / "match_decisions.jsonl"


def log_match_decision(
    student_id: int,
    internship_id: int,
    status: str,
    final_score: float,
    details: dict
):
    """
    Append a single match decision to JSONL log.
    """

    record = {
        "timestamp": datetime.utcnow().isoformat(),
        "student_id": student_id,
        "internship_id": internship_id,
        "status": status,
        "final_score": final_score,
        "details": details
    }

    with open(MATCH_LOG_FILE, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")
