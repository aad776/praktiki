import numpy as np
from typing import Dict, List
from app.embeddings.encoder import SkillTextEncoder


def cosine_similarity(vec1, vec2) -> float:
    """
    Compute cosine similarity between two vectors.
    """
    vec1 = np.array(vec1)
    vec2 = np.array(vec2)

    if np.linalg.norm(vec1) == 0 or np.linalg.norm(vec2) == 0:
        return 0.0

    return float(
        np.dot(vec1, vec2) /
        (np.linalg.norm(vec1) * np.linalg.norm(vec2))
    )


class EmbeddingMatcher:
    """
    Model 2: Embedding-based skill matcher
    """

    def __init__(self):
        self.encoder = SkillTextEncoder()

    def match(
        self,
        student_skills: Dict[str, int],
        internship_skills: Dict[str, int]
    ) -> dict:
        """
        Compute embedding similarity between student and internship.
        """

        # 1️⃣ Convert skills to text
        student_skill_list = list(student_skills.keys())
        internship_skill_list = list(internship_skills.keys())

        student_text = self.encoder.skills_to_text(student_skill_list)
        internship_text = self.encoder.skills_to_text(internship_skill_list)

        # 2️⃣ Generate embeddings
        student_embedding = self.encoder.encode(student_text)
        internship_embedding = self.encoder.encode(internship_text)

        # 3️⃣ Similarity
        similarity = cosine_similarity(
            student_embedding,
            internship_embedding
        )

        # 4️⃣ Normalize score (0–100)
        final_score = round(similarity * 100, 2)

        # 5️⃣ Explainability
        matched_skills = list(
            set(student_skill_list) & set(internship_skill_list)
        )

        missing_skills = list(
            set(internship_skill_list) - set(student_skill_list)
        )

        return {
            "model": "embedding_based",
            "final_score": final_score,
            "similarity": round(similarity, 3),
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "student_text": student_text,
            "internship_text": internship_text
        }
