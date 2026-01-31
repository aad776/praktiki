from sentence_transformers import SentenceTransformer
from typing import List


class SkillTextEncoder:
    """
    Converts skill text into vector embeddings.
    Uses pretrained sentence transformer.
    """

    def __init__(self):
        self.model = SentenceTransformer("all-MiniLM-L6-v2")

    @staticmethod
    def skills_to_text(skills: List[str]) -> str:
        """
        Convert skill list to single text string.
        """
        return " ".join(skills)

    def encode(self, text: str):
        """
        Generate embedding for given text.
        """
        return self.model.encode(text)
