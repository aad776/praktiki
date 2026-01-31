"""
Vectorizer Service
Generates skill embeddings using Sentence Transformers
"""
from typing import List, Optional
import numpy as np


class Vectorizer:
    """Service for generating skill embeddings"""
    
    MODEL_NAME = "all-MiniLM-L6-v2"
    VECTOR_DIM = 384  # Dimension of MiniLM embeddings
    
    def __init__(self):
        self._model = None
    
    @property
    def model(self):
        """Lazy load sentence transformer model"""
        if self._model is None:
            try:
                from sentence_transformers import SentenceTransformer
                self._model = SentenceTransformer(self.MODEL_NAME)
            except ImportError:
                raise ImportError(
                    "sentence-transformers is required. "
                    "Install with: pip install sentence-transformers"
                )
        return self._model
    
    def generate_skill_vector(self, skills: List[str]) -> List[float]:
        """
        Generate a combined embedding vector for a list of skills
        
        Args:
            skills: List of skill names
        
        Returns:
            384-dimensional embedding vector
        """
        if not skills:
            return [0.0] * self.VECTOR_DIM
        
        # Combine skills into a single text
        skill_text = " ".join(skills)
        
        # Generate embedding
        vector = self.model.encode(skill_text)
        
        return vector.tolist()
    
    def generate_text_vector(self, text: str) -> List[float]:
        """
        Generate an embedding vector for any text
        
        Args:
            text: Input text
        
        Returns:
            384-dimensional embedding vector
        """
        if not text or not text.strip():
            return [0.0] * self.VECTOR_DIM
        
        vector = self.model.encode(text)
        return vector.tolist()
    
    def compute_similarity(
        self, 
        vector1: List[float], 
        vector2: List[float]
    ) -> float:
        """
        Compute cosine similarity between two vectors
        
        Args:
            vector1: First embedding vector
            vector2: Second embedding vector
        
        Returns:
            Similarity score between 0 and 1
        """
        try:
            from sklearn.metrics.pairwise import cosine_similarity
            
            v1 = np.array(vector1).reshape(1, -1)
            v2 = np.array(vector2).reshape(1, -1)
            
            similarity = cosine_similarity(v1, v2)[0][0]
            return float(max(0.0, min(1.0, similarity)))
        except ImportError:
            # Fallback to manual computation
            v1 = np.array(vector1)
            v2 = np.array(vector2)
            
            dot_product = np.dot(v1, v2)
            norm1 = np.linalg.norm(v1)
            norm2 = np.linalg.norm(v2)
            
            if norm1 == 0 or norm2 == 0:
                return 0.0
            
            return float(dot_product / (norm1 * norm2))


# Singleton instance
vectorizer = Vectorizer()
