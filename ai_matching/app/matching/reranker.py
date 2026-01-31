from app.matching.cross_encoder import CrossEncoderModel
from app.matching.text_builder import (
    build_student_text,
    build_internship_text
)

CROSS_ENCODER_WEIGHT = 0.3  # keep hybrid dominant


class ReRanker:
    def __init__(self):
        self.cross_encoder = CrossEncoderModel()

    def rerank(self, student, ranked_results: list) -> list:
        """
        ranked_results: list of dicts with internship + score
        """
        student_text = build_student_text(student)

        for item in ranked_results:
            internship = item["internship"]
            internship_text = build_internship_text(internship)

            ce_score = self.cross_encoder.score(
                student_text,
                internship_text
            )

            # combine scores
            item["final_score"] = round(
                (1 - CROSS_ENCODER_WEIGHT) * item["final_score"]
                + CROSS_ENCODER_WEIGHT * ce_score,
                2
            )

            item["cross_encoder_score"] = round(ce_score, 2)

        ranked_results.sort(
            key=lambda x: x["final_score"],
            reverse=True
        )

        return ranked_results
