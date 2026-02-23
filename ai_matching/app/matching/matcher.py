from app.models.students import Student
from app.models.internship import Internship
from app.rules.eligibility import check_eligibility
from app.skills.taxonomy import SkillTaxonomy
from app.skills.vectorizer import SkillVectorizer
from app.matching.similarity import cosine_similarity

from app.analytics.logger import log_match_decision
from app.analytics.metrics import record_rejection, record_matched_skills


def _compute_hierarchy_coverage(taxonomy, student_skills, internship_skills):
    """
    For every required skill, find the best partial credit the student earns
    via exact, child, sibling, parent, or domain match.

    Returns (weighted_coverage, exact_matches, partial_matches, details).
    """
    exact_matches: list[str] = []
    partial_matches: list[dict] = []

    total_credit = 0.0

    for req_skill in internship_skills:
        best_credit = 0.0
        best_source = None

        for stu_skill in student_skills:
            credit = taxonomy.hierarchy_credit(stu_skill, req_skill)
            if credit > best_credit:
                best_credit = credit
                best_source = stu_skill

        total_credit += best_credit

        if best_credit >= 1.0:
            exact_matches.append(req_skill)
        elif best_credit > 0:
            partial_matches.append({
                "required": req_skill,
                "matched_via": best_source,
                "credit": round(best_credit, 2),
            })

    coverage = total_credit / len(internship_skills) if internship_skills else 0
    return coverage, exact_matches, partial_matches


def match_student_to_internship(
    student: Student,
    internship: Internship
) -> dict:
    """
    Product-grade matching function (v2.0)
    Includes:
    - Eligibility gating
    - Skill similarity (vector-based)
    - Hierarchy-aware coverage scoring (exact + partial credit)
    - Hierarchy bonus (parent/child/sibling/domain matches)
    - Tech-stack detection
    - Penalties
    - Logging & analytics hooks
    """

    eligible, reasons = check_eligibility(student, internship)

    if not eligible:
        record_rejection(reasons)
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

    taxonomy = SkillTaxonomy()
    student_skills = taxonomy.normalize_skills(student.skills)
    internship_skills = taxonomy.normalize_skills(internship.required_skills)

    # --- Vector similarity (50 pts) ---
    skill_index = SkillVectorizer.build_index(student_skills, internship_skills)
    vectorizer = SkillVectorizer(skill_index)

    student_vector = vectorizer.vectorize(student_skills)
    internship_vector = vectorizer.vectorize(internship_skills)

    similarity = cosine_similarity(student_vector, internship_vector)
    similarity_score = similarity * 50

    # --- Hierarchy-aware coverage (20 pts) ---
    coverage, exact_matches, partial_matches = _compute_hierarchy_coverage(
        taxonomy, student_skills, internship_skills,
    )
    coverage_score = coverage * 20

    # --- Hierarchy bonus (10 pts) ---
    # Rewards partial/domain/stack overlap beyond strict coverage.
    hierarchy_bonus = min(len(partial_matches) * 2.0, 10.0)

    detected_stacks = taxonomy.detect_stacks(set(student_skills.keys()))
    if detected_stacks:
        hierarchy_bonus = min(hierarchy_bonus + 2.0, 10.0)

    # --- Penalties ---
    gap_penalty = 0
    overqualification_penalty = 0

    for skill, required_level in internship_skills.items():
        student_level = student_skills.get(skill, 0)
        if student_level < required_level:
            gap_penalty += (required_level - student_level) * 2
        elif student_level > required_level + 2:
            overqualification_penalty += 1

    # --- Preference (20 pts) ---
    preference_score = 20 if (
        internship.is_remote or
        student.location.lower() == internship.location.lower()
    ) else 0

    # --- Final score ---
    final_score = round(
        similarity_score
        + coverage_score
        + hierarchy_bonus
        + preference_score
        - gap_penalty
        - overqualification_penalty,
        2,
    )
    final_score = max(final_score, 0)

    all_matched = set(exact_matches) | {
        pm["matched_via"] for pm in partial_matches
    }
    record_matched_skills(all_matched)

    log_match_decision(
        student_id=student.id,
        internship_id=internship.id,
        status="MATCHED",
        final_score=final_score,
        details={
            "similarity_score": round(similarity_score, 2),
            "coverage_score": round(coverage_score, 2),
            "hierarchy_bonus": round(hierarchy_bonus, 2),
            "gap_penalty": gap_penalty,
            "overqualification_penalty": overqualification_penalty,
            "exact_matches": exact_matches,
            "partial_matches": partial_matches,
            "detected_stacks": detected_stacks,
        },
    )

    return {
        "status": "MATCHED",
        "final_score": final_score,
        "breakdown": {
            "similarity_score": round(similarity_score, 2),
            "coverage_score": round(coverage_score, 2),
            "hierarchy_bonus": round(hierarchy_bonus, 2),
            "preference_score": preference_score,
            "gap_penalty": gap_penalty,
            "overqualification_penalty": overqualification_penalty,
        },
        "explanation": [
            f"Exact skill matches: {len(exact_matches)} of {len(internship_skills)} required",
            f"Partial matches (hierarchy): {len(partial_matches)}",
            f"Skill similarity: {round(similarity, 2)}",
            f"Tech stacks detected: {detected_stacks or 'none'}",
            "Eligibility criteria passed",
        ],
        "matched_skills": {
            "exact": exact_matches,
            "partial": partial_matches,
        },
        "detected_stacks": detected_stacks,
    }
