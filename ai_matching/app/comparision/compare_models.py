from typing import List
from app.matching.matcher import match_student_to_internship
from app.embeddings.embedding_matcher import EmbeddingMatcher
from app.models.student import Student
from app.models.internship import Internship


def compare_models(
    student: Student,
    internships: List[Internship]
):
    """
    Compare Model 1 (rule-based) vs Model 2 (embedding-based)
    for the same student and internships.
    """

    embedding_matcher = EmbeddingMatcher()

    model_1_results = []
    model_2_results = []

    for internship in internships:
        # 🔹 Model 1: Rule-based
        rule_result = match_student_to_internship(student, internship)
        model_1_results.append({
            "internship_id": internship.id,
            "score": rule_result["final_score"],
            "status": rule_result["status"]
        })

        # 🔹 Model 2: Embedding-based
        embed_result = embedding_matcher.match(
            student.skills,
            internship.required_skills
        )
        model_2_results.append({
            "internship_id": internship.id,
            "score": embed_result["final_score"]
        })

    # Sort rankings
    model_1_ranked = sorted(
        model_1_results,
        key=lambda x: x["score"],
        reverse=True
    )

    model_2_ranked = sorted(
        model_2_results,
        key=lambda x: x["score"],
        reverse=True
    )

    return {
        "model_1_ranking": model_1_ranked,
        "model_2_ranking": model_2_ranked
    }


# 🧪 DEMO RUN (optional)
if __name__ == "__main__":
    student = Student(
        id=1,
        skills={
            "Python": 3,
            "SQL": 2,
            "React": 1
        },
        year=3,
        location="Delhi"
    )

    internships = [
        Internship(
            id=101,
            required_skills={
                "Python": 2,
                "Django": 2,
                "SQL": 2
            },
            min_year=2,
            location="Delhi",
            is_remote=False
        ),
        Internship(
            id=102,
            required_skills={
                "React": 2,
                "JavaScript": 2
            },
            min_year=3,
            location="Remote",
            is_remote=True
        ),
        Internship(
            id=103,
            required_skills={
                "Python": 3,
                "Machine Learning": 1
            },
            min_year=3,
            location="Delhi",
            is_remote=False
        )
    ]

    comparison = compare_models(student, internships)

    print("\nMODEL 1 (Rule-Based) Ranking:")
    for rank, item in enumerate(comparison["model_1_ranking"], start=1):
        print(rank, item)

    print("\nMODEL 2 (Embedding-Based) Ranking:")
    for rank, item in enumerate(comparison["model_2_ranking"], start=1):
        print(rank, item)
