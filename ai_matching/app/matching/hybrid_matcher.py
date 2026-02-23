from app.embeddings.embedding_model import EmbeddingModel
from app.skills.taxonomy import SkillTaxonomy

RULE_WEIGHT = 0.6
EMBEDDING_WEIGHT = 0.4


class HybridMatcher:
    def __init__(self):
        self.embedding_model = EmbeddingModel()
        self.taxonomy = SkillTaxonomy()

    def match(self, student, internship) -> dict:
        """
        Hybrid matching:
        - eligibility gate
        - hierarchy-aware rule-based score
        - embedding similarity
        - weighted final score
        """

        # ---------- 1. ELIGIBILITY ----------
        if student.year < internship.min_year:
            return {"status": "REJECTED", "reason": "Year not eligible"}

        if not internship.is_remote and student.location != internship.location:
            return {"status": "REJECTED", "reason": "Location mismatch"}

        # ---------- 2. NORMALIZE ----------
        student_skill_names = {
            self.taxonomy.normalize(s) for s in student.skills
        }
        required_skill_names = {
            self.taxonomy.normalize(s) for s in internship.required_skills
        }

        # ---------- 3. HIERARCHY-AWARE RULE SCORE ----------
        exact_matches: list[str] = []
        partial_matches: list[dict] = []
        missing_skills: list[str] = []

        total_credit = 0.0
        for req in required_skill_names:
            best_credit = 0.0
            best_source = None
            for stu in student_skill_names:
                credit = self.taxonomy.hierarchy_credit(stu, req)
                if credit > best_credit:
                    best_credit = credit
                    best_source = stu

            total_credit += best_credit
            if best_credit >= 1.0:
                exact_matches.append(req)
            elif best_credit > 0:
                partial_matches.append({
                    "required": req,
                    "matched_via": best_source,
                    "credit": round(best_credit, 2),
                })
            else:
                missing_skills.append(req)

        rule_score = (
            total_credit / len(required_skill_names) * 100
            if required_skill_names else 0
        )

        # ---------- 4. EMBEDDING SCORE ----------
        student_emb = self.embedding_model.encode_skills(student.skills)
        internship_emb = self.embedding_model.encode_skills(internship.required_skills)

        embedding_score = (
            self.embedding_model.similarity(student_emb, internship_emb) * 100
        )

        # ---------- 5. FINAL HYBRID SCORE ----------
        final_score = (
            RULE_WEIGHT * rule_score
            + EMBEDDING_WEIGHT * embedding_score
        )

        # ---------- 6. TECH STACKS ----------
        detected_stacks = self.taxonomy.detect_stacks(student_skill_names)

        # ---------- 7. EXPLAINABILITY ----------
        explanation = {
            "exact_matches": exact_matches,
            "partial_matches": partial_matches,
            "missing_skills": missing_skills,
            "rule_based_score": round(rule_score, 2),
            "embedding_score": round(embedding_score, 2),
            "detected_stacks": detected_stacks,
            "weights": {
                "rule": RULE_WEIGHT,
                "embedding": EMBEDDING_WEIGHT,
            },
        }

        return {
            "status": "MATCHED",
            "final_score": round(final_score, 2),
            "explanation": explanation,
        }
