from app.models.students import Student
from app.models.internship import Internship
from app.rules.eligibility import check_eligibility
from app.skills.taxonomy import SkillTaxonomy
from app.skills.vectorizer import SkillVectorizer
from app.matching.similarity import cosine_similarity

from app.analytics.logger import log_match_decision
from app.analytics.metrics import record_rejection, record_matched_skills


def match_student_to_internship(
    student: Student,
    internship: Internship
) -> dict:
    """
    Product-grade matching function (v1.5)
    Includes:
    - Eligibility gating
    - Skill similarity
    - Coverage scoring
    - Penalties
    - Logging & analytics hooks
    """

   
    eligible, reasons = check_eligibility(student, internship)

    if not eligible:
        # 🔹 Analytics
        record_rejection(reasons)

        # 🔹 Logging
        log_match_decision(
            student_id=student.id,
            internship_id=internship.id,
            status="REJECTED",
            final_score=0,
            details={"reasons": reasons}
        )

        return {
            "status": "REJECTED",
            "final_score": 0,
            "reasons": reasons
        }

    # 2️⃣ Normalize Skills
    taxonomy = SkillTaxonomy()
    student_skills = taxonomy.normalize_skills(student.skills)
    internship_skills = taxonomy.normalize_skills(internship.required_skills)

    # 3️⃣ Vectorization
    skill_index = SkillVectorizer.build_index(
        student_skills,
        internship_skills
    )
    vectorizer = SkillVectorizer(skill_index)

    student_vector = vectorizer.vectorize(student_skills)
    internship_vector = vectorizer.vectorize(internship_skills)

    # 4️⃣ Skill Similarity
    similarity = cosine_similarity(student_vector, internship_vector)
    similarity_score = similarity * 60

    # 5️⃣ Skill Coverage
    matched_skills = set(student_skills) & set(internship_skills)
    skill_coverage = len(matched_skills) / len(internship_skills)
    coverage_score = skill_coverage * 20

    # 6️⃣ Penalties
    gap_penalty = 0
    overqualification_penalty = 0

    for skill, required_level in internship_skills.items():
        student_level = student_skills.get(skill, 0)

        if student_level < required_level:
            gap_penalty += (required_level - student_level) * 2
        elif student_level > required_level + 2:
            overqualification_penalty += 1

    # 7️⃣ Preference Score
    preference_score = 20 if (
        internship.is_remote or
        student.location.lower() == internship.location.lower()
    ) else 0

    # 8️⃣ Final Score
    final_score = round(
        similarity_score +
        coverage_score +
        preference_score -
        gap_penalty -
        overqualification_penalty,
        2
    )

    final_score = max(final_score, 0)

    # 🔹 Analytics
    record_matched_skills(matched_skills)

    # 🔹 Logging
    log_match_decision(
        student_id=student.id,
        internship_id=internship.id,
        status="MATCHED",
        final_score=final_score,
        details={
            "similarity_score": round(similarity_score, 2),
            "coverage_score": round(coverage_score, 2),
            "gap_penalty": gap_penalty,
            "overqualification_penalty": overqualification_penalty,
            "matched_skills": list(matched_skills)
        }
    )

    return {
        "status": "MATCHED",
        "final_score": final_score,
        "breakdown": {
            "similarity_score": round(similarity_score, 2),
            "coverage_score": round(coverage_score, 2),
            "preference_score": preference_score,
            "gap_penalty": gap_penalty,
            "overqualification_penalty": overqualification_penalty
        },
        "explanation": [
            f"Matched {len(matched_skills)} of {len(internship_skills)} required skills",
            f"Skill similarity: {round(similarity, 2)}",
            "Eligibility criteria passed"
        ]
    }
