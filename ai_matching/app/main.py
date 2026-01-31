from fastapi import FastAPI, HTTPException
from app.api.routes import router
from app.matching.reranker import ReRanker
from app.feedback.feedback_engine import compute_feedback_boost

reranker = ReRanker()

from app.data_loader import load_students, load_internships
from app.matching.matcher import match_student_to_internship
app = FastAPI(
    title="AI Matching Module (Phase-1)",
    description="Student ↔ Internship Matching API",
    version="1.0"
)

app.include_router(router)


@app.get("/")
def root():
    return {"status": "AI Matching API is running"}

students_db = load_students()
internships_db = load_internships()

print(f"Loaded {len(students_db)} students")
print(f"Loaded {len(internships_db)} internships")

@app.get("/recommend")
def recommend_internships(student_id: int, top_n: int = 5):
    if student_id not in students_db:
        raise HTTPException(status_code=404, detail="Student not found")

    student = students_db[student_id]

    results = []

    for internship in internships_db:
        result = match_student_to_internship(student, internship)

        if result["status"] == "MATCHED":
            results.append({
                "internship_id": internship.id,
                "score": result["final_score"],
                "explanation": result["explanation"]
            })

    results.sort(key=lambda x: x["score"], reverse=True)

    return {
        "student_id": student_id,
        "recommendations": results[:top_n]
    }
from app.matching.hybrid_matcher import HybridMatcher

matcher = HybridMatcher()
@app.get("/recommend/hybrid")
def recommend_hybrid(student_id: int, top_n: int = 5):
    if student_id not in students_db:
        return {"error": "Student not found"}

    student = students_db[student_id]
    results = []

    # --------- 1. HYBRID MATCHING + FEEDBACK DECAY ----------
    for internship in internships_db:
        match_result = matcher.match(student, internship)

        if match_result["status"] == "MATCHED":
            feedback_boost = compute_feedback_boost(
                student_id=student.id,
                internship_id=internship.id
            )

            final_score = round(
                match_result["final_score"] + feedback_boost, 2
            )

            results.append({
                "internship_id": internship.id,
                "internship": internship,   # needed for reranker
                "final_score": final_score,
                "base_score": match_result["final_score"],
                "feedback_boost": feedback_boost,
                "explanation": match_result["explanation"]
            })

    # sort by hybrid + feedback score
    results.sort(key=lambda x: x["final_score"], reverse=True)

    # --------- 2. CROSS-ENCODER RE-RANKING (TOP 10 ONLY) ----------
    top_candidates = results[:10]
    reranked = reranker.rerank(student, top_candidates)

    # --------- 3. CLEAN FINAL RESPONSE ----------
    final_results = [
        {
            "internship_id": r["internship"].id,
            "final_score": r["final_score"],
            "base_score": r["base_score"],
            "feedback_boost": r["feedback_boost"],
            "cross_encoder_score": r["cross_encoder_score"],
            "explanation": r["explanation"]
        }
        for r in reranked
    ]

    return {
        "student_id": student_id,
        "recommendations": final_results[:top_n]
    }

from app.feedback.feedback_model import FeedbackEvent
from app.feedback.feedback_store import record_feedback


@app.post("/feedback")
def capture_feedback(event: FeedbackEvent):
    record_feedback(
        student_id=event.student_id,
        internship_id=event.internship_id,
        action=event.action
    )

    return {
        "status": "recorded",
        "student_id": event.student_id,
        "internship_id": event.internship_id,
        "action": event.action
    }
