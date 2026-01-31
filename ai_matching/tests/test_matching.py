from app.models.students import Student
from app.models.internship import Internship
from app.matching.matcher import match_student_to_internship


def test_successful_match():
    student = Student(
        id=1,
        skills={"python": 3, "sql": 1},
        year=2,
        location="mumbai",
        preferences={}
    )

    internship = Internship(
        id=1,
        required_skills={"python": 2},
        min_year=2,
        location="Delhi",
        is_remote=False
    )

    result = match_student_to_internship(student, internship)

    assert result["status"] == "MATCHED"
    assert result["final_score"] > 0


def test_rejected_due_to_skill():
    student = Student(
        id=2,
        skills={"python": 1},
        year=3,
        location="Delhi",
        preferences={}
    )

    internship = Internship(
        id=2,
        required_skills={"python": 3},
        min_year=2,
        location="Delhi",
        is_remote=False
    )

    result = match_student_to_internship(student, internship)

    assert result["status"] == "REJECTED"
    assert result["final_score"] == 0
