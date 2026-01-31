from sentence_transformers import CrossEncoder

class CrossEncoderModel:
    def __init__(self):
        # 🔥 Job-matching friendly model
        self.model = CrossEncoder(
            "cross-encoder/ms-marco-MiniLM-L-6-v2"
        )

    def score(self, student_text: str, internship_text: str) -> float:
        """
        Returns relevance score (higher = better)
        """
        score = self.model.predict(
            [(student_text, internship_text)]
        )[0]

        return float(score)
