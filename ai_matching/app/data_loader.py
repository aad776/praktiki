import json
from pathlib import Path
from typing import Dict, List

from app.models.students import Student
from app.models.internship import Internship

DATA_DIR = Path(__file__).resolve().parent / "data"
STUDENTS_FILE = DATA_DIR / "students.json"
INTERNSHIPS_FILE = DATA_DIR / "internships.json"


def load_students() -> Dict[int, Student]:
    """
    Load students from JSON into memory.
    Returns dict: student_id -> Student object
    """
    with open(STUDENTS_FILE, "r", encoding="utf-8") as f:
        raw_students = json.load(f)

    students = {}
    for s in raw_students:
        student = Student(
            id=s["id"],
            skills=s["skills"],
            year=s["year"],
            location=s["location"]
        )
        students[student.id] = student

    return students


def load_internships() -> List[Internship]:
    """
    Load internships from JSON into memory.
    """
    with open(INTERNSHIPS_FILE, "r", encoding="utf-8") as f:
        raw_internships = json.load(f)

    internships = []
    for i in raw_internships:
        internship = Internship(
            id=i["id"],
            required_skills=i["required_skills"],
            min_year=i["min_year"],
            location=i["location"],
            is_remote=i["is_remote"]
        )
        internships.append(internship)

    return internships
