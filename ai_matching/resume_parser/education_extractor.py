"""
Education Extractor  (Phase 4 complement)

Extracts structured education entries from resume text:
  - Degree (B.S., M.Tech, PhD, etc.)
  - Institution / University
  - Graduation year
  - GPA / CGPA
  - Field of study

Uses the SectionDetector to isolate the Education block first, then
the RelationExtractor to group Degree <-> Institution <-> Date.
"""

from __future__ import annotations

import re
import logging
from typing import List, Optional

from relation_extractor import RelationExtractor, EntityGroup

logger = logging.getLogger(__name__)

_INSTITUTION_KEYWORDS = {
    "university", "college", "institute", "school", "academy",
    "polytechnic", "iit", "nit", "iiit", "bits", "mit", "stanford",
    "harvard", "oxford", "cambridge",
}

_FIELD_PATTERN = re.compile(
    r"(?:in|of)\s+([A-Z][A-Za-z\s&]+?)(?:\s*[,\n(]|\s*$)",
)


class EducationEntry:
    __slots__ = ("degree", "institution", "year", "gpa", "field_of_study", "raw_text")

    def __init__(
        self,
        degree: Optional[str] = None,
        institution: Optional[str] = None,
        year: Optional[str] = None,
        gpa: Optional[str] = None,
        field_of_study: Optional[str] = None,
        raw_text: Optional[str] = None,
    ):
        self.degree = degree
        self.institution = institution
        self.year = year
        self.gpa = gpa
        self.field_of_study = field_of_study
        self.raw_text = raw_text

    def to_dict(self) -> dict:
        return {
            "degree": self.degree,
            "institution": self.institution,
            "year": self.year,
            "gpa": self.gpa,
            "field_of_study": self.field_of_study,
        }


class EducationExtractor:
    def __init__(self, nlp=None):
        self._relation_extractor = RelationExtractor(nlp=nlp)

    def extract(self, text: str) -> List[EducationEntry]:
        groups = self._relation_extractor.extract_education_groups(text)

        entries: List[EducationEntry] = []
        lines = text.split("\n")

        for group in groups:
            entry = self._group_to_entry(group, lines)
            if entry.degree or entry.institution:
                entries.append(entry)

        if not entries:
            entries = self._fallback_extract(text)

        logger.info(f"Extracted {len(entries)} education entries")
        return entries

    def _group_to_entry(
        self, group: EntityGroup, lines: List[str]
    ) -> EducationEntry:
        degree = group.get("DEGREE")
        year = group.get("DATE")
        gpa = group.get("GPA")

        institution = group.get("ORG")
        if not institution:
            institution = self._find_institution_from_context(group, lines)

        field_of_study = None
        if degree:
            for ent in group.entities:
                if ent.label in ("DEGREE", "DATE", "GPA"):
                    continue
                fm = _FIELD_PATTERN.search(ent.text)
                if fm:
                    field_of_study = fm.group(1).strip()
                    break

        raw = "\n".join(
            lines[e.line_num]
            for e in group.entities
            if 0 <= e.line_num < len(lines)
        )

        return EducationEntry(
            degree=degree,
            institution=institution,
            year=year,
            gpa=gpa,
            field_of_study=field_of_study,
            raw_text=raw,
        )

    @staticmethod
    def _find_institution_from_context(
        group: EntityGroup, lines: List[str]
    ) -> Optional[str]:
        line_nums = sorted({e.line_num for e in group.entities})
        for ln in line_nums:
            if 0 <= ln < len(lines):
                lower = lines[ln].lower()
                if any(kw in lower for kw in _INSTITUTION_KEYWORDS):
                    return lines[ln].strip()
            if 0 <= ln - 1 < len(lines):
                lower = lines[ln - 1].lower()
                if any(kw in lower for kw in _INSTITUTION_KEYWORDS):
                    return lines[ln - 1].strip()
        return None

    def _fallback_extract(self, text: str) -> List[EducationEntry]:
        """Simple regex fallback when relation extraction finds nothing."""
        entries: List[EducationEntry] = []
        degree_pat = re.compile(
            r"((?:Bachelor|Master|Ph\.?D|B\.?(?:S|A|E|Tech)|M\.?(?:S|A|E|Tech|BA))"
            r"[^,\n]{0,80})",
            re.IGNORECASE,
        )
        for m in degree_pat.finditer(text):
            snippet = text[max(0, m.start() - 100) : m.end() + 100]
            institution = None
            for line in snippet.split("\n"):
                if any(kw in line.lower() for kw in _INSTITUTION_KEYWORDS):
                    institution = line.strip()
                    break
            year_m = re.search(r"((?:19|20)\d{2})", snippet)
            entries.append(
                EducationEntry(
                    degree=m.group().strip(),
                    institution=institution,
                    year=year_m.group() if year_m else None,
                )
            )
        return entries
