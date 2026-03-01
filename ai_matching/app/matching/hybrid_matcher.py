from app.embeddings.embedding_model import EmbeddingModel

# weights (easy to tune later)
RULE_WEIGHT = 0.6
EMBEDDING_WEIGHT = 0.4


class HybridMatcher:
    def __init__(self):
        self.embedding_model = EmbeddingModel()

    def match(self, student, internship) -> dict:
        """
        Hybrid matching:
        - eligibility gate
        - rule-based score
        - embedding similarity
        - weighted final score
        """

        # ---------- 1. ELIGIBILITY ----------
        if student.year < internship.min_year:
            return {"status": "REJECTED", "reason": "Year not eligible"}

        if not internship.is_remote and student.location != internship.location:
            return {"status": "REJECTED", "reason": "Location mismatch"}

        # ---------- 2. RULE-BASED SCORE ----------
        matched_skills = set(student.skills) & set(internship.required_skills)
        missing_skills = set(internship.required_skills) - matched_skills

        rule_score = len(matched_skills) / len(internship.required_skills) * 100

        # ---------- 3. EMBEDDING SCORE ----------
        student_emb = self.embedding_model.encode_skills(student.skills)
        internship_emb = self.embedding_model.encode_skills(internship.required_skills)

        embedding_score = (
            self.embedding_model.similarity(student_emb, internship_emb) * 100
        )

        # ---------- 4. FINAL HYBRID SCORE ----------
        final_score = (
            RULE_WEIGHT * rule_score
            + EMBEDDING_WEIGHT * embedding_score
        )
        
        # Cap at 100%
        final_score = min(100.0, max(0.0, final_score))

        # ---------- 5. EXPLAINABILITY ----------
        explanation = {
            "matched_skills": list(matched_skills),
            "missing_skills": list(missing_skills),
            "rule_based_score": round(rule_score, 2),
            "embedding_score": round(embedding_score, 2),
            "weights": {
                "rule": RULE_WEIGHT,
                "embedding": EMBEDDING_WEIGHT
            }
        }

        return {
            "status": "MATCHED",
            "final_score": round(final_score, 2),
            "explanation": explanation
        }
