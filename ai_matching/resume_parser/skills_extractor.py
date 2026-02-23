"""
Skills Extraction Module
Hybrid approach: Exact matching + Fuzzy/typo matching + Semantic similarity (FAISS)
"""
import re
import logging
from typing import Dict, List, Set, Tuple

import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from rapidfuzz import fuzz, process as rfprocess

from config import (
    SKILL_LIST,
    SKILL_NORMALIZATION,
    SENTENCE_TRANSFORMER_MODEL,
    FAISS_SIMILARITY_THRESHOLD,
    FAISS_INDEX_DIM,
)

logger = logging.getLogger(__name__)

FUZZY_SCORE_THRESHOLD = 85
FUZZY_MIN_TOKEN_LEN = 3


class SkillsExtractor:
    """Extracts skills using exact + fuzzy + semantic matching."""

    def __init__(self):
        try:
            logger.info(f"Loading embedding model: {SENTENCE_TRANSFORMER_MODEL}")
            self.model = SentenceTransformer(SENTENCE_TRANSFORMER_MODEL)

            self.skill_list = SKILL_LIST
            self.skill_embeddings = self.model.encode(self.skill_list)

            self.index = faiss.IndexFlatIP(FAISS_INDEX_DIM)
            faiss.normalize_L2(self.skill_embeddings)
            self.index.add(np.array(self.skill_embeddings).astype("float32"))

            self._skill_lower_map: Dict[str, str] = {
                s.lower(): s for s in self.skill_list
            }

            logger.info(f"FAISS index built with {len(self.skill_list)} skills")
        except Exception as e:
            logger.error(f"Error initializing SkillsExtractor: {e}")
            raise

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract_skills(
        self,
        text: str,
        use_semantic: bool = True,
        use_fuzzy: bool = True,
    ) -> List[str]:
        """
        Extract skills from text using a four-stage pipeline:
        1. Exact matching (case-insensitive, word boundaries)
        2. Synonym / normalization mapping
        3. Fuzzy / typo matching via rapidfuzz
        4. Semantic matching via FAISS embeddings
        """
        try:
            found_skills: Set[str] = set()
            text_lower = text.lower()

            # Stage 1: exact match
            for skill in self.skill_list:
                pattern = r"\b" + re.escape(skill.lower()) + r"\b"
                if re.search(pattern, text_lower):
                    found_skills.add(skill)

            # Stage 2: synonym / normalization
            for variant, canonical in SKILL_NORMALIZATION.items():
                pattern = r"\b" + re.escape(variant.lower()) + r"\b"
                if re.search(pattern, text_lower):
                    found_skills.add(canonical)

            # Stage 3: fuzzy / typo matching
            if use_fuzzy:
                fuzzy_skills = self._fuzzy_match(text)
                found_skills.update(fuzzy_skills)

            # Stage 4: semantic matching
            if use_semantic:
                semantic_skills = self._semantic_match(text)
                found_skills.update(semantic_skills)

            skills_list = sorted(found_skills)
            logger.info(f"Extracted {len(skills_list)} skills: {skills_list}")
            return skills_list
        except Exception as e:
            logger.error(f"Error extracting skills: {e}")
            return []

    # ------------------------------------------------------------------
    # Fuzzy matching  (Phase 5 -- typo correction)
    # ------------------------------------------------------------------

    def _fuzzy_match(self, text: str) -> Set[str]:
        """
        Tokenize the resume text and compare each token (and bigram) against
        the canonical skill list using rapidfuzz weighted-ratio.

        Catches typos like "Pyton" -> "Python", "Kuberntes" -> "Kubernetes".
        """
        try:
            fuzzy_skills: Set[str] = set()
            tokens = re.findall(r"[A-Za-z0-9#+.]+", text)

            candidates: List[str] = []
            for i, tok in enumerate(tokens):
                if len(tok) >= FUZZY_MIN_TOKEN_LEN:
                    candidates.append(tok)
                if i + 1 < len(tokens):
                    bigram = f"{tok} {tokens[i + 1]}"
                    if len(bigram) >= FUZZY_MIN_TOKEN_LEN + 2:
                        candidates.append(bigram)

            candidates = list(set(candidates))[:300]

            skill_choices = list(self._skill_lower_map.keys())

            for candidate in candidates:
                result = rfprocess.extractOne(
                    candidate.lower(),
                    skill_choices,
                    scorer=fuzz.WRatio,
                    score_cutoff=FUZZY_SCORE_THRESHOLD,
                )
                if result:
                    matched_lower, score, _ = result
                    canonical = self._skill_lower_map[matched_lower]
                    if canonical.lower() != candidate.lower():
                        fuzzy_skills.add(canonical)
                        logger.debug(
                            f"Fuzzy match: '{candidate}' -> {canonical} "
                            f"(score: {score:.0f})"
                        )

            return fuzzy_skills
        except Exception as e:
            logger.error(f"Error in fuzzy matching: {e}")
            return set()

    # ------------------------------------------------------------------
    # Semantic matching  (Phase 5 -- FAISS vector DB)
    # ------------------------------------------------------------------

    def _semantic_match(self, text: str) -> Set[str]:
        """
        Split text into chunks, embed, and search the FAISS skill index.
        """
        try:
            semantic_skills: Set[str] = set()

            chunks = re.split(r"[,.\n]+", text)
            chunks = [c.strip() for c in chunks if len(c.strip()) > 5][:100]

            if not chunks:
                return semantic_skills

            chunk_embeddings = self.model.encode(chunks)
            chunk_embeddings = np.array(chunk_embeddings).astype("float32")
            faiss.normalize_L2(chunk_embeddings)

            k = 3
            distances, indices = self.index.search(chunk_embeddings, k)

            for i, (dist_row, idx_row) in enumerate(zip(distances, indices)):
                for dist, idx in zip(dist_row, idx_row):
                    similarity = float(dist)
                    if similarity >= FAISS_SIMILARITY_THRESHOLD:
                        skill = self.skill_list[idx]
                        semantic_skills.add(skill)
                        logger.debug(
                            f"Semantic match: '{chunks[i][:30]}...' -> "
                            f"{skill} (sim: {similarity:.2f})"
                        )

            return semantic_skills
        except Exception as e:
            logger.error(f"Error in semantic matching: {e}")
            return set()

    # ------------------------------------------------------------------
    # Categorisation via SkillGraph hierarchy
    # ------------------------------------------------------------------

    def get_skill_categories(self, skills: List[str]) -> dict:
        from app.skills.skill_graph import get_skill_graph

        graph = get_skill_graph()
        categories: dict[str, list[str]] = {}
        for skill in skills:
            domain = graph.get_domain(skill)
            categories.setdefault(domain or "Other", []).append(skill)
        return categories


def extract_skills(text: str, use_semantic: bool = True) -> List[str]:
    extractor = SkillsExtractor()
    return extractor.extract_skills(text, use_semantic)
