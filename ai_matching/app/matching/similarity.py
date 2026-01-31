import numpy as np


def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """
    Compute cosine similarity between two vectors.
    Returns value between 0 and 1.
    """

    if vec1.size == 0 or vec2.size == 0:
        return 0.0

    norm1 = np.linalg.norm(vec1)
    norm2 = np.linalg.norm(vec2)

    if norm1 == 0 or norm2 == 0:
        return 0.0

    similarity = np.dot(vec1, vec2) / (norm1 * norm2)
    return float(round(similarity, 4))
