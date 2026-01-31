from typing import List, Tuple
from app.models.students import Student
from app.models.internship import Internship


def check_eligibility(
    student: Student,
    internship: Internship
) -> Tuple[bool, List[str]]:
    """
    Checks whether a student is eligible for a given internship.

    Returns:
        (is_eligible, reasons)
    """

    reasons: List[str] = []

    # 1️⃣ Academic year check
    if student.year < internship.min_year:
        reasons.append(
            f"Student year {student.year} is less than required year {internship.min_year}"
        )

    # 2️⃣ Mandatory skill presence + level check
    for skill, required_level in internship.required_skills.items():
        if not student.has_skill(skill):
            reasons.append(f"Missing required skill: {skill}")
        elif student.skill_level(skill) < required_level:
            reasons.append(
                f"Skill level too low for {skill} "
                f"(required {required_level}, has {student.skill_level(skill)})"
            )

    # 3️⃣ Location check (only if internship is NOT remote)
    if not internship.is_remote:
        if student.location.lower() != internship.location.lower():
            reasons.append(
                f"Location mismatch: student in {student.location}, "
                f"internship in {internship.location}"
            )

    # Final decision
    is_eligible = len(reasons) == 0
    return is_eligible, reasons
