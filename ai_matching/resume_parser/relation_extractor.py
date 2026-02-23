"""
Relation Extractor  (Phase 4 -- Entity Grouping)

Links Job Title <-> Company <-> Dates that belong to the same work-experience
entry, and Degree <-> Institution <-> Year for education.

Approach -- proximity graph with heuristic scoring:
  1. Run spaCy NER + regex to detect entity mentions (ORG, DATE, JOB_TITLE)
     within a section's text.
  2. Build an undirected graph where each entity is a node.
  3. Score edges by:
        a) Line distance  (entities on the same or adjacent lines score high)
        b) Character proximity
        c) Ordering prior  (title usually precedes company which precedes date)
  4. Greedily cluster nodes into groups, each representing one experience
     or education entry.

No external GNN dependency -- runs on any machine that has spaCy.
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Entity types and detection patterns
# ---------------------------------------------------------------------------

@dataclass
class EntityMention:
    text: str
    label: str          # JOB_TITLE | ORG | DATE | DEGREE | FIELD_OF_STUDY | GPA
    line_num: int
    char_start: int
    char_end: int


@dataclass
class EntityGroup:
    """A cluster of related entity mentions (one experience / education entry)."""
    entities: List[EntityMention] = field(default_factory=list)

    def get(self, label: str) -> Optional[str]:
        for e in self.entities:
            if e.label == label:
                return e.text
        return None

    def get_all(self, label: str) -> List[str]:
        return [e.text for e in self.entities if e.label == label]


_DATE_PATTERN = re.compile(
    r"(?:"
    r"(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"\s*[,.]?\s*\d{4}"
    r"|(?:19|20)\d{2}\s*[-\u2013\u2014to]+\s*(?:(?:19|20)\d{2}|[Pp]resent|[Cc]urrent|[Nn]ow)"
    r"|(?:19|20)\d{2}"
    r")",
    re.IGNORECASE,
)

_DATE_RANGE_PATTERN = re.compile(
    r"(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"\s*[,.]?\s*)?\d{4}\s*[-\u2013\u2014to]+\s*"
    r"(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|"
    r"Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)"
    r"\s*[,.]?\s*)?(?:\d{4}|[Pp]resent|[Cc]urrent|[Nn]ow)",
    re.IGNORECASE,
)

_DEGREE_PATTERN = re.compile(
    r"\b(?:B\.?S\.?c?|B\.?A\.?|B\.?E\.?|B\.?Tech|M\.?S\.?c?|M\.?A\.?|M\.?E\.?|"
    r"M\.?Tech|M\.?B\.?A\.?|Ph\.?D\.?|Doctor(?:ate)?|Bachelor(?:'?s)?|"
    r"Master(?:'?s)?|Associate(?:'?s)?|Diploma)\b",
    re.IGNORECASE,
)

_GPA_PATTERN = re.compile(
    r"(?:GPA|CGPA|C\.G\.P\.A|Grade)[:\s]*(\d+\.?\d*)\s*/?\s*(\d+\.?\d*)?",
    re.IGNORECASE,
)

_TITLE_KEYWORDS = {
    "intern", "engineer", "developer", "analyst", "designer", "manager",
    "lead", "director", "consultant", "specialist", "coordinator",
    "administrator", "architect", "scientist", "researcher", "associate",
    "assistant", "officer", "executive", "head", "vp", "president",
    "technician", "trainee", "fellow", "professor", "lecturer", "teacher",
    "full stack", "frontend", "backend", "devops", "data",
    "software", "senior", "junior", "principal", "staff",
}


class RelationExtractor:
    """Links entity mentions into coherent groups within a section."""

    def __init__(self, nlp=None):
        """
        Args:
            nlp: Optional pre-loaded spaCy Language object.
                 If None, entity detection falls back to regex-only.
        """
        self._nlp = nlp

    def extract_experience_groups(self, text: str) -> List[EntityGroup]:
        mentions = self._detect_entities(text, mode="experience")
        return self._cluster(mentions)

    def extract_education_groups(self, text: str) -> List[EntityGroup]:
        mentions = self._detect_entities(text, mode="education")
        return self._cluster(mentions)

    # ------------------------------------------------------------------
    # Entity detection
    # ------------------------------------------------------------------

    def _detect_entities(
        self, text: str, mode: str = "experience"
    ) -> List[EntityMention]:
        mentions: List[EntityMention] = []
        lines = text.split("\n")
        char_offset = 0

        for line_num, line in enumerate(lines):
            if mode == "experience":
                mentions.extend(self._detect_experience_entities(line, line_num, char_offset))
            else:
                mentions.extend(self._detect_education_entities(line, line_num, char_offset))
            char_offset += len(line) + 1

        if self._nlp:
            mentions.extend(self._spacy_entities(text, lines))

        mentions.sort(key=lambda m: (m.line_num, m.char_start))
        return mentions

    def _detect_experience_entities(
        self, line: str, line_num: int, offset: int
    ) -> List[EntityMention]:
        ents: List[EntityMention] = []

        for m in _DATE_RANGE_PATTERN.finditer(line):
            ents.append(EntityMention(
                text=m.group().strip(), label="DATE",
                line_num=line_num, char_start=offset + m.start(),
                char_end=offset + m.end(),
            ))

        if not any(e.label == "DATE" for e in ents):
            for m in _DATE_PATTERN.finditer(line):
                ents.append(EntityMention(
                    text=m.group().strip(), label="DATE",
                    line_num=line_num, char_start=offset + m.start(),
                    char_end=offset + m.end(),
                ))

        stripped = line.strip()
        if stripped and len(stripped) < 80:
            lower = stripped.lower()
            if any(kw in lower for kw in _TITLE_KEYWORDS):
                if not _DATE_PATTERN.search(stripped):
                    ents.append(EntityMention(
                        text=stripped, label="JOB_TITLE",
                        line_num=line_num, char_start=offset,
                        char_end=offset + len(stripped),
                    ))

        return ents

    def _detect_education_entities(
        self, line: str, line_num: int, offset: int
    ) -> List[EntityMention]:
        ents: List[EntityMention] = []

        for m in _DEGREE_PATTERN.finditer(line):
            ents.append(EntityMention(
                text=m.group().strip(), label="DEGREE",
                line_num=line_num, char_start=offset + m.start(),
                char_end=offset + m.end(),
            ))

        for m in _DATE_PATTERN.finditer(line):
            ents.append(EntityMention(
                text=m.group().strip(), label="DATE",
                line_num=line_num, char_start=offset + m.start(),
                char_end=offset + m.end(),
            ))

        for m in _GPA_PATTERN.finditer(line):
            ents.append(EntityMention(
                text=m.group().strip(), label="GPA",
                line_num=line_num, char_start=offset + m.start(),
                char_end=offset + m.end(),
            ))

        return ents

    def _spacy_entities(
        self, text: str, lines: List[str]
    ) -> List[EntityMention]:
        """Use spaCy NER for ORG detection (company / institution names)."""
        ents: List[EntityMention] = []
        try:
            doc = self._nlp(text)
            for ent in doc.ents:
                if ent.label_ == "ORG":
                    line_num = text[:ent.start_char].count("\n")
                    ents.append(EntityMention(
                        text=ent.text.strip(), label="ORG",
                        line_num=line_num, char_start=ent.start_char,
                        char_end=ent.end_char,
                    ))
        except Exception as e:
            logger.warning(f"spaCy NER fallback failed: {e}")
        return ents

    # ------------------------------------------------------------------
    # Clustering -- greedy proximity grouping
    # ------------------------------------------------------------------

    def _cluster(self, mentions: List[EntityMention]) -> List[EntityGroup]:
        """
        Walk through mentions in document order. Start a new group whenever
        we encounter a DATE that is >= 2 lines away from the previous DATE
        (indicating a new entry), or when the entity flow restarts
        (TITLE -> ORG -> DATE pattern repeats).
        """
        if not mentions:
            return []

        groups: List[EntityGroup] = []
        current = EntityGroup()

        prev_date_line: Optional[int] = None

        for mention in mentions:
            if mention.label == "DATE":
                if prev_date_line is not None and abs(mention.line_num - prev_date_line) > 2:
                    if current.entities:
                        groups.append(current)
                        current = EntityGroup()
                prev_date_line = mention.line_num

            elif mention.label in ("JOB_TITLE", "DEGREE"):
                if current.entities and current.get(mention.label):
                    groups.append(current)
                    current = EntityGroup()
                    prev_date_line = None

            current.entities.append(mention)

        if current.entities:
            groups.append(current)

        return groups
