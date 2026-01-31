from fastapi import APIRouter
from app.api.schemas import (
    MatchRequest,
    RecommendRequest
)
from app.models.students import Student
from app.models.internship import Internship
from app.matching.matcher import match_student_to_internship
from app.matching.recommender import recommend_top_internships

router = APIRouter()


@router.post("/match")
def match_endpoint(request: MatchRequest):
    student = Student(**request.student.dict())
    internship = Internship(**request.internship.dict())

    result = match_student_to_internship(student, internship)
    return result


@router.post("/recommend")
def recommend_endpoint(request: RecommendRequest):
    student = Student(**request.student.dict())
    internships = [
        Internship(**internship.dict())
        for internship in request.internships
    ]

    results = recommend_top_internships(
        student=student,
        internships=internships,
        top_n=request.top_n
    )

    return {
        "count": len(results),
        "recommendations": results
    }
