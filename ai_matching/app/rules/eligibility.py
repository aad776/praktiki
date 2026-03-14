from typing import List, Tuple
from app.models.students import Student
from app.models.internship import Internship
from app.skills.taxonomy import SkillTaxonomy

# Minimum hierarchy credit required for a skill to count as "present"
# during eligibility gating.  Anything above zero means the student has
# at least a related skill (sibling / parent / child / domain).
_MIN_RELATED_CREDIT = 0.2


def check_eligibility(
    student: Student,
    internship: Internship
) -> Tuple[bool, List[str]]:
    """
    Checks whether a student is eligible for a given internship.
    Uses the SkillTaxonomy to normalize names and accept hierarchy-related
    skills so that, e.g., a student with "PyTorch" isn't hard-rejected
    when the job asks for "Deep Learning".

    Returns:
        (is_eligible, reasons)
    """
    taxonomy = SkillTaxonomy()

    reasons: List[str] = []

    if student.year < internship.min_year:
        reasons.append(
            f"Student year {student.year} is less than required year {internship.min_year}"
        )

    normalized_student: dict[str, int] = taxonomy.normalize_skills(student.skills)
    normalized_required: dict[str, int] = taxonomy.normalize_skills(internship.required_skills)

    for req_skill, required_level in normalized_required.items():
        if req_skill in normalized_student:
            if normalized_student[req_skill] < required_level:
                reasons.append(
                    f"Skill level too low for {req_skill} "
                    f"(required {required_level}, has {normalized_student[req_skill]})"
                )
            continue

        best_credit = max(
            (taxonomy.hierarchy_credit(s, req_skill) for s in normalized_student),
            default=0.0,
        )
        if best_credit < _MIN_RELATED_CREDIT:
            reasons.append(f"Missing required skill: {req_skill}")

    if not internship.is_remote:
        if student.location.lower() != internship.location.lower():
            reasons.append(
                f"Location mismatch: student in {student.location}, "
                f"internship in {internship.location}"
            )

    is_eligible = len(reasons) == 0
    return is_eligible, reasons
