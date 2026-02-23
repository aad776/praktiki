"""
Skills Extraction Module
Hybrid approach: Exact matching + Semantic similarity using FAISS
"""
import logging
from typing import List, Set
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from config import (
    SKILL_LIST, 
    SKILL_NORMALIZATION, 
    SENTENCE_TRANSFORMER_MODEL,
    FAISS_SIMILARITY_THRESHOLD,
    FAISS_INDEX_DIM
)

logger = logging.getLogger(__name__)


class SkillsExtractor:
    """Extracts skills using exact matching and semantic similarity"""
    
    def __init__(self):
        """Initialize skills extractor with embedding model and FAISS index"""
        try:
            logger.info(f"Loading embedding model: {SENTENCE_TRANSFORMER_MODEL}")
            self.model = SentenceTransformer(SENTENCE_TRANSFORMER_MODEL)
            
            # Create FAISS index for skill embeddings
            self.skill_list = SKILL_LIST
            self.skill_embeddings = self.model.encode(self.skill_list)
            
            # Build FAISS index (L2 distance, then convert to cosine similarity)
            self.index = faiss.IndexFlatIP(FAISS_INDEX_DIM)  # Inner product for cosine similarity
            
            # Normalize embeddings for cosine similarity
            faiss.normalize_L2(self.skill_embeddings)
            self.index.add(np.array(self.skill_embeddings).astype('float32'))
            
            logger.info(f"FAISS index built with {len(self.skill_list)} skills")
        
        except Exception as e:
            logger.error(f"Error initializing SkillsExtractor: {e}")
            raise
    
    def extract_skills(self, text: str, use_semantic: bool = True) -> List[str]:
        """
        Extract skills from text using hybrid approach
        
        Strategy:
        1. Exact matching (case-insensitive) - Primary method
        2. Semantic matching via FAISS - For variations and synonyms
        3. Normalization using SKILL_NORMALIZATION mapping
        
        Args:
            text: Resume text
            use_semantic: Whether to use semantic matching (default: True)
            
        Returns:
            List of unique extracted skills
        """
        try:
            found_skills: Set[str] = set()
            
            # Step 1: Exact matching (case-insensitive)
            text_lower = text.lower()
            
            for skill in self.skill_list:
                skill_lower = skill.lower()
                
                # Check if skill appears as a whole word (with word boundaries)
                import re
                pattern = r'\b' + re.escape(skill_lower) + r'\b'
                
                if re.search(pattern, text_lower):
                    found_skills.add(skill)
                    logger.debug(f"Exact match: {skill}")
            
            # Step 2: Check normalization mapping
            for variant, canonical in SKILL_NORMALIZATION.items():
                variant_lower = variant.lower()
                pattern = r'\b' + re.escape(variant_lower) + r'\b'
                
                if re.search(pattern, text_lower):
                    found_skills.add(canonical)
                    logger.debug(f"Normalized match: {variant} -> {canonical}")
            
            # Step 3: Semantic matching (optional)
            if use_semantic:
                semantic_skills = self._semantic_match(text)
                found_skills.update(semantic_skills)
            
            skills_list = sorted(list(found_skills))
            logger.info(f"Extracted {len(skills_list)} skills: {skills_list}")
            
            return skills_list
        
        except Exception as e:
            logger.error(f"Error extracting skills: {e}")
            return []
    
    def _semantic_match(self, text: str) -> Set[str]:
        """
        Use FAISS to find skills semantically similar to text chunks
        
        Args:
            text: Resume text
            
        Returns:
            Set of skills found via semantic matching
        """
        try:
            semantic_skills: Set[str] = set()
            
            # Split text into meaningful chunks (sentences or phrases)
            import re
            # Split by newlines, commas, and periods
            chunks = re.split(r'[,.\n]+', text)
            chunks = [chunk.strip() for chunk in chunks if len(chunk.strip()) > 5]
            
            # Limit to first 100 chunks to avoid excessive processing
            chunks = chunks[:100]
            
            if not chunks:
                return semantic_skills
            
            # Encode chunks
            chunk_embeddings = self.model.encode(chunks)
            chunk_embeddings = np.array(chunk_embeddings).astype('float32')
            faiss.normalize_L2(chunk_embeddings)
            
            # Search for similar skills
            k = 3  # Top 3 similar skills per chunk
            distances, indices = self.index.search(chunk_embeddings, k)
            
            # Filter by similarity threshold
            for i, (dist_row, idx_row) in enumerate(zip(distances, indices)):
                for dist, idx in zip(dist_row, idx_row):
                    # Distance is cosine similarity (after normalization)
                    similarity = float(dist)
                    
                    if similarity >= FAISS_SIMILARITY_THRESHOLD:
                        skill = self.skill_list[idx]
                        semantic_skills.add(skill)
                        logger.debug(f"Semantic match: '{chunks[i][:30]}...' -> {skill} (similarity: {similarity:.2f})")
            
            return semantic_skills
        
        except Exception as e:
            logger.error(f"Error in semantic matching: {e}")
            return set()
    
    def get_skill_categories(self, skills: List[str]) -> dict:
        """
        Categorize extracted skills using the SkillGraph hierarchy.
        
        Args:
            skills: List of extracted skills
            
        Returns:
            Dictionary mapping domain/category names to skill lists.
        """
        from app.skills.skill_graph import get_skill_graph
        graph = get_skill_graph()

        categories: dict[str, list[str]] = {}

        for skill in skills:
            domain = graph.get_domain(skill)
            if domain:
                categories.setdefault(domain, []).append(skill)
            else:
                categories.setdefault("Other", []).append(skill)

        return categories


# Module-level function for direct usage
def extract_skills(text: str, use_semantic: bool = True) -> List[str]:
    """
    Convenience function to extract skills
    
    Args:
        text: Resume text
        use_semantic: Whether to use semantic matching
        
    Returns:
        List of extracted skills
    """
    extractor = SkillsExtractor()
    return extractor.extract_skills(text, use_semantic)
