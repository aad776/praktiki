"""
Experience Extraction Module

Two-stage approach:
  1. Primary: RelationExtractor groups Title <-> Company <-> Date entities
     using proximity-graph clustering (Phase 4).
  2. Fallback: legacy regex-based extraction for resumes where the relation
     extractor finds no groups.
"""

import re
import logging
from typing import List, Optional

from schemas import Experience
from config import YEAR_RANGE_PATTERN
from relation_extractor import RelationExtractor, EntityGroup

logger = logging.getLogger(__name__)


class ExperienceExtractor:
    """Extracts work experience entries via relation extraction + regex fallback."""

    def __init__(self, nlp=None):
        self._relation = RelationExtractor(nlp=nlp)
        logger.info("ExperienceExtractor initialized (relation-extraction mode)")

    def extract_experiences(self, text: str) -> List[Experience]:
        try:
            groups = self._relation.extract_experience_groups(text)

            if groups:
                experiences = [self._group_to_experience(g, text) for g in groups]
                experiences = [e for e in experiences if e.duration or e.position]
            else:
                logger.info("Relation extractor found 0 groups, falling back to regex")
                experiences = self._legacy_extract(text)

            unique = self._deduplicate(experiences)
            logger.info(f"Extracted {len(unique)} experience entries")
            return unique
        except Exception as e:
            logger.error(f"Error extracting experiences: {e}")
            return []

    @staticmethod
    def _group_to_experience(group: EntityGroup, full_text: str) -> Experience:
        position = group.get("JOB_TITLE")
        company = group.get("ORG")
        duration = group.get("DATE")

        lines = full_text.split("\n")
        desc_lines: list[str] = []

        if group.entities:
            last_line = max(e.line_num for e in group.entities)
            for ln in range(last_line + 1, min(last_line + 6, len(lines))):
                line = lines[ln].strip()
                if not line:
                    continue
                if YEAR_RANGE_PATTERN.search(line):
                    break
                desc_lines.append(line)

        description = " ".join(desc_lines)[:300] if desc_lines else None

        return Experience(
            company=company,
            position=position,
            duration=duration,
            description=description,
        )

    def _legacy_extract(self, text: str) -> List[Experience]:
        """Original regex-based extraction as fallback."""
        experiences: list[Experience] = []
        year_matches = list(YEAR_RANGE_PATTERN.finditer(text))
        if not year_matches:
            return []

        for match in year_matches:
            try:
                duration = match.group(0).strip()
                start_pos = max(0, match.start() - 200)
                end_pos = min(len(text), match.end() + 200)
                context = text[start_pos:end_pos]

                lines = context.split("\n")
                date_line_idx: Optional[int] = None
                for idx, line in enumerate(lines):
                    if duration in line:
                        date_line_idx = idx
                        break
                if date_line_idx is None:
                    continue

                company = position = None
                for idx in range(max(0, date_line_idx - 3), date_line_idx):
                    line = lines[idx].strip()
                    if line and 3 < len(line) < 100:
                        if position is None:
                            position = line
                        elif company is None:
                            company = line

                desc_lines: list[str] = []
                for idx in range(
                    date_line_idx + 1, min(len(lines), date_line_idx + 5)
                ):
                    line = lines[idx].strip()
                    if line and not YEAR_RANGE_PATTERN.search(line):
                        desc_lines.append(line)

                description = " ".join(desc_lines) if desc_lines else None
                experiences.append(
                    Experience(
                        company=company,
                        position=position,
                        duration=duration,
                        description=description[:200] if description else None,
                    )
                )
            except Exception:
                continue
        return experiences

    @staticmethod
    def _deduplicate(experiences: List[Experience]) -> List[Experience]:
        seen: set[str] = set()
        unique: list[Experience] = []
        for exp in experiences:
            key = (exp.duration or "") + (exp.position or "")
            if key and key not in seen:
                seen.add(key)
                unique.append(exp)
        return unique

    @staticmethod
    def extract_total_years_experience(experiences: List[Experience]) -> float:
        total = 0.0
        for exp in experiences:
            if not exp.duration:
                continue
            try:
                years = re.findall(r"((?:19|20)\d{2})", exp.duration)
                if len(years) >= 2:
                    total += int(years[1]) - int(years[0])
                elif len(years) == 1 and re.search(
                    r"present|current|now", exp.duration, re.IGNORECASE
                ):
                    total += 2026 - int(years[0])
            except Exception:
                continue
        return total


def extract_experience(text: str) -> List[Experience]:
    return ExperienceExtractor().extract_experiences(text)
