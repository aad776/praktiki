from typing import List, Dict
from app.models.students import Student
from app.models.internship import Internship
from app.matching.matcher import match_student_to_internship


def recommend_top_internships(
    student: Student,
    internships: List[Internship],
    top_n: int = 5
) -> List[Dict]:
    """
    Recommend top N internships for a student based on match score.
    """

    results: List[Dict] = []

    for internship in internships:
        match_result = match_student_to_internship(student, internship)

        if match_result["status"] == "MATCHED":
            results.append({
                "internship_id": internship.id,
                "final_score": match_result["final_score"],
                "breakdown": match_result["breakdown"],
                "explanation": match_result["explanation"]
            })

    # Sort by final score (descending)
    results.sort(key=lambda x: x["final_score"], reverse=True)

    return results[:top_n]
