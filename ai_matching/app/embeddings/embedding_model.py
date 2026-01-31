from sentence_transformers import SentenceTransformer, util
import numpy as np

class EmbeddingModel:
    def __init__(self):
        # 🔥 Better than basic SBERT
        self.model = SentenceTransformer("all-mpnet-base-v2")

    def encode_skills(self, skills: list[str]) -> np.ndarray:
        """
        Convert list of skills into a single embedding
        """
        text = " ".join(skills)
        return self.model.encode(text, normalize_embeddings=True)

    def similarity(self, emb1: np.ndarray, emb2: np.ndarray) -> float:
        """
        Cosine similarity between two embeddings (0–1)
        """
        return float(util.cos_sim(emb1, emb2))
