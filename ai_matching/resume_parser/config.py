"""
Configuration module for Resume Parser
Centralized settings for models, patterns, and skill taxonomy.

Skill list and synonym map are sourced from the unified SkillGraph so that
the resume parser and the matching engine always stay in sync.
"""
import os
import sys
import re
from typing import List, Dict
import logging

# Logging Configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# ---------------------------------------------------------------------------
# Make the parent `ai_matching/` package importable so we can reach
# app.skills.skill_graph even when the working dir is resume_parser/.
# ---------------------------------------------------------------------------
_AI_MATCHING_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if _AI_MATCHING_ROOT not in sys.path:
    sys.path.insert(0, _AI_MATCHING_ROOT)

from app.skills.skill_graph import get_skill_graph  # noqa: E402

_graph = get_skill_graph()

# Model Configuration
SPACY_MODEL = "en_core_web_trf"
SENTENCE_TRANSFORMER_MODEL = "all-MiniLM-L6-v2"
FAISS_INDEX_DIM = 384

# File Upload Configuration
MAX_FILE_SIZE_MB = 10
ALLOWED_EXTENSIONS = {".pdf"}

# Regex Patterns
EMAIL_PATTERN = re.compile(
    r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
)

PHONE_PATTERN = re.compile(
    r'(?:(?:\+|00)\d{1,3}[\s.-]?)?'
    r'(?:\(?\d{1,4}\)?[\s.-]?)?'
    r'\d{3,4}[\s.-]?\d{3,4}'
)

# Experience extraction patterns
# Matches both "2024-2025" and "Nov 2024 – Sep 2025" and "Aug 2023 – Jul 2027"
_MONTH_PREFIX = (
    r'(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
    r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+)?'
)
YEAR_RANGE_PATTERN = re.compile(
    _MONTH_PREFIX +
    r'(?:19|20)\d{2}\s*[-\u2013\u2014to]+\s*' +
    _MONTH_PREFIX +
    r'(?:(?:19|20)\d{2}|Present|Current|Now)',
    re.IGNORECASE
)

MONTH_YEAR_PATTERN = re.compile(
    r'(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
    r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
    r'\s*(?:19|20)\d{2}',
    re.IGNORECASE
)

# ---------------------------------------------------------------------------
# Skill list & normalization -- sourced from SkillGraph
# ---------------------------------------------------------------------------
SKILL_LIST: List[str] = _graph.all_canonical_skills()

SKILL_NORMALIZATION: Dict[str, str] = _graph.get_synonym_map()

# FAISS Configuration
FAISS_SIMILARITY_THRESHOLD = 0.75

# Entity Extraction Configuration
MAX_NAME_WORDS = 4
MIN_NAME_WORDS = 2

# Logging
logger = logging.getLogger(__name__)
