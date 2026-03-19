"""
Skills Extraction Module
Hybrid approach: Exact matching + Semantic similarity using FAISS
"""
import logging
from typing import List, Set
import numpy as np
import faiss
import difflib
import re
from sentence_transformers import SentenceTransformer

try:
    # Package mode: `uvicorn resume_parser.main:app`
    from .config import (
        SKILL_LIST,
        SKILL_ALIASES,
        SKILL_ONTOLOGY,
        SENTENCE_TRANSFORMER_MODEL,
        FAISS_SIMILARITY_THRESHOLD,
        FAISS_INDEX_DIM,
    )
except ImportError:
    # Script mode: `uvicorn main:app` from resume_parser directory
    from config import (
        SKILL_LIST,
        SKILL_ALIASES,
        SKILL_ONTOLOGY,
        SENTENCE_TRANSFORMER_MODEL,
        FAISS_SIMILARITY_THRESHOLD,
        FAISS_INDEX_DIM,
    )

logger = logging.getLogger(__name__)


class SkillsExtractor:
    """Extracts skills using exact matching and semantic similarity"""
    
    def __init__(self):
        """Initialize skills extractor with embedding model and FAISS index"""
        self.model = None
        self.index = None
        self.skill_list = SKILL_LIST
        self.alias_to_canonical = {}
        
        # Create industry standard alias mapping (alias -> canonical)
        for canonical, aliases in SKILL_ALIASES.items():
            for alias in aliases:
                self.alias_to_canonical[alias.lower()] = canonical

        try:
            logger.info(f"Loading embedding model: {SENTENCE_TRANSFORMER_MODEL}")
            self.model = SentenceTransformer(SENTENCE_TRANSFORMER_MODEL)
            
            # Create FAISS index for skill embeddings
            self.skill_embeddings = self.model.encode(self.skill_list)
            
            # Build FAISS index (L2 distance, then convert to cosine similarity)
            self.index = faiss.IndexFlatIP(FAISS_INDEX_DIM)  # Inner product for cosine similarity
            
            # Normalize embeddings for cosine similarity
            faiss.normalize_L2(self.skill_embeddings)
            self.index.add(np.array(self.skill_embeddings).astype('float32'))
            
            logger.info(f"FAISS index built with {len(self.skill_list)} skills and {len(self.alias_to_canonical)} aliases")
        
        except Exception as e:
            logger.error(f"Error initializing SkillsExtractor semantic matching: {e}")
            logger.warning("Falling back to exact matching only")
            self.model = None
            self.index = None
    
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
            
            # Step 1: Pre-process text (clean punctuation and multiple spaces)
            # Remove punctuation except dots and pluses (which are common in skills like Node.js, C++)
            clean_text = re.sub(r'[^\w\s.+/-]', ' ', text.lower())
            clean_text = re.sub(r'\s+', ' ', clean_text)
            
            # Extract common bi-grams and tri-grams to fuzzy match against
            words = clean_text.split()
            tokens = words.copy()
            for i in range(len(words) - 1):
                tokens.append(f"{words[i]} {words[i+1]}")
            for i in range(len(words) - 2):
                tokens.append(f"{words[i]} {words[i+1]} {words[i+2]}")
                
            # Deduplicate tokens to speed up mapping
            tokens = list(set(tokens))
            
            # Step 2: Exact mapping (Case-insensitive & Alias resolution)
            for skill in self.skill_list:
                skill_lower = skill.lower()
                pattern = r'\b' + re.escape(skill_lower) + r'\b'
                
                # Check for canonical match
                if re.search(pattern, text.lower()):
                    found_skills.add(skill)
                    logger.debug(f"Exact match: {skill}")
                    
            # Check Industry Standard Aliases
            for alias, canonical in self.alias_to_canonical.items():
                pattern = r'\b' + re.escape(alias) + r'\b'
                if re.search(pattern, text.lower()) or alias in clean_text:
                    found_skills.add(canonical)
                    logger.debug(f"Alias match: {alias} -> {canonical}")
                    
            # Step 3: Fuzzy matching for simple typos directly against tokens
            # Only do fuzzy matching if token length is substantial to avoid false positives
            long_tokens = [t for t in tokens if len(t) > 4]
            all_known_variants = [s.lower() for s in self.skill_list] + list(self.alias_to_canonical.keys())
            
            for token in long_tokens:
                # Get close matches with 85% similarity (catches "Javscript", "Postgresq")
                matches = difflib.get_close_matches(token, all_known_variants, n=1, cutoff=0.88)
                if matches:
                    matched_str = matches[0]
                    # Route back to canonical using our inverted index
                    canonical = self.alias_to_canonical.get(matched_str)
                    
                    # If not in aliases, it must be in the canonical list natively
                    if not canonical:
                        # Find the matching original canonical skill
                        idx = all_known_variants.index(matched_str)
                        canonical = self.skill_list[idx] if idx < len(self.skill_list) else None
                        
                    if canonical and canonical not in found_skills:
                        found_skills.add(canonical)
                        logger.debug(f"Fuzzy match: {token} -> {canonical}")
            
            # Step 4: Semantic matching (FAISS) for broad semantic variations
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
        if not self.model or not self.index:
            return set()

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
    
    def get_structured_skills(self, extracted_skills: List[str]) -> dict:
        """
        Build a hierarchical taxonomy of skills based on the raw extracted skills
        using the SKILL_ONTOLOGY.
        """
        inferred_languages = set()
        inferred_domains = set()
        inferred_parents = set()
        industry_equivalents = set()
        
        for skill in extracted_skills:
            if skill in SKILL_ONTOLOGY:
                ontology = SKILL_ONTOLOGY[skill]
                inferred_languages.update(ontology.get("language", []))
                inferred_domains.update(ontology.get("domain", []))
                inferred_parents.update(ontology.get("parent", []))
                industry_equivalents.update(ontology.get("equivalents", []))
        
        # Categorize all skills (explicit + inferred)
        all_skills = list(set(extracted_skills) | inferred_languages | inferred_parents)
        categories = self.get_skill_categories(all_skills)
        
        return {
            "raw_extracted": extracted_skills,
            "inferred_languages": sorted(list(inferred_languages)),
            "inferred_domains": sorted(list(inferred_domains)),
            "inferred_parents": sorted(list(inferred_parents)),
            "industry_equivalents": sorted(list(industry_equivalents)),
            "categories": categories
        }

    def get_skill_categories(self, skills: List[str]) -> dict:
        """
        Categorize extracted skills (optional advanced feature)
        
        Args:
            skills: List of extracted skills
            
        Returns:
            Dictionary of skill categories
        """
        categories = {
            "languages": [],
            "frontend": [],
            "backend": [],
            "databases": [],
            "devops": [],
            "other": []
        }
        
        # Simple categorization logic (can be enhanced)
        language_keywords = {"python", "javascript", "java", "c++", "c#", "go", "typescript", "ruby", "php"}
        frontend_keywords = {"react", "angular", "vue", "html", "css", "bootstrap", "tailwind"}
        backend_keywords = {"node.js", "django", "flask", "fastapi", "spring", "express"}
        database_keywords = {"postgresql", "mysql", "mongodb", "redis", "sqlite", "oracle"}
        devops_keywords = {"docker", "kubernetes", "aws", "azure", "gcp", "jenkins", "terraform"}
        
        for skill in skills:
            skill_lower = skill.lower()
            
            if any(kw in skill_lower for kw in language_keywords):
                categories["languages"].append(skill)
            elif any(kw in skill_lower for kw in frontend_keywords):
                categories["frontend"].append(skill)
            elif any(kw in skill_lower for kw in backend_keywords):
                categories["backend"].append(skill)
            elif any(kw in skill_lower for kw in database_keywords):
                categories["databases"].append(skill)
            elif any(kw in skill_lower for kw in devops_keywords):
                categories["devops"].append(skill)
            else:
                categories["other"].append(skill)
        
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
