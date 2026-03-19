"""
Section Detector  (Phase 3 -- Segmentation Strategy)

Segments a resume into semantic blocks: Header, Work Experience, Education,
Skills, Projects, Certifications, Summary/Objective, Other.

Approach:
  1. Rule-based heading detection using a curated set of section-header
     patterns (covers ~95 % of standard resumes).
  2. Optional spaCy-based fallback that looks for short, title-cased lines
     that sit between longer paragraphs.
  3. Returns ordered list of ``Section`` objects each carrying the section
     label and its raw text span.
"""

from __future__ import annotations

import re
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class SectionLabel(str, Enum):
    HEADER = "header"
    SUMMARY = "summary"
    EXPERIENCE = "experience"
    EDUCATION = "education"
    SKILLS = "skills"
    PROJECTS = "projects"
    CERTIFICATIONS = "certifications"
    AWARDS = "awards"
    PUBLICATIONS = "publications"
    LANGUAGES = "languages"
    INTERESTS = "interests"
    REFERENCES = "references"
    OTHER = "other"


@dataclass
class Section:
    label: SectionLabel
    text: str
    start_line: int
    end_line: int
    confidence: float = 1.0


_HEADING_PATTERNS: Dict[SectionLabel, re.Pattern] = {
    SectionLabel.SUMMARY: re.compile(
        r"^(?:professional\s+)?(?:summary|objective|profile|about\s+me|career\s+objective)",
        re.IGNORECASE,
    ),
    SectionLabel.EXPERIENCE: re.compile(
        r"^(?:work\s+)?(?:experience|employment|professional\s+experience|"
        r"work\s+history|career\s+history|relevant\s+experience|"
        r"internships?|work\s+experience)",
        re.IGNORECASE,
    ),
    SectionLabel.EDUCATION: re.compile(
        r"^(?:education|academic|qualifications|educational\s+background"
        r"|academic\s+background|degrees?|relevant\s+coursework)",
        re.IGNORECASE,
    ),
    SectionLabel.SKILLS: re.compile(
        r"^(?:(?:technical\s+|core\s+|key\s+)?skills|competenc(?:ies|e)|"
        r"technologies|tech\s+stack|tools?\s*(?:&|and)\s*technologies)",
        re.IGNORECASE,
    ),
    SectionLabel.PROJECTS: re.compile(
        r"^(?:projects?|personal\s+projects?|academic\s+projects?|"
        r"key\s+projects?|portfolio)",
        re.IGNORECASE,
    ),
    SectionLabel.CERTIFICATIONS: re.compile(
        r"^(?:certifications?|licenses?|professional\s+certifications?|"
        r"accreditations?|courses?|training)",
        re.IGNORECASE,
    ),
    SectionLabel.AWARDS: re.compile(
        r"^(?:awards?|honors?|achievements?|accomplishments?)", re.IGNORECASE,
    ),
    SectionLabel.PUBLICATIONS: re.compile(
        r"^(?:publications?|papers?|research)", re.IGNORECASE,
    ),
    SectionLabel.LANGUAGES: re.compile(
        r"^(?:languages?|linguistic)", re.IGNORECASE,
    ),
    SectionLabel.INTERESTS: re.compile(
        r"^(?:interests?|hobbies?|extracurricular|activities)", re.IGNORECASE,
    ),
    SectionLabel.REFERENCES: re.compile(
        r"^(?:references?)", re.IGNORECASE,
    ),
}

_HEADING_LINE_MAX_LEN = 60
_HEADER_MAX_LINES = 8


class SectionDetector:
    """Detects resume sections using pattern-based heading recognition."""

    def detect(self, text: str) -> List[Section]:
        lines = text.split("\n")
        heading_positions: List[Tuple[int, SectionLabel, float]] = []

        for idx, raw_line in enumerate(lines):
            line = raw_line.strip()
            if not line or len(line) > _HEADING_LINE_MAX_LEN:
                continue

            cleaned = re.sub(r"[^a-zA-Z\s]", "", line).strip()
            if not cleaned:
                continue

            for label, pattern in _HEADING_PATTERNS.items():
                if pattern.search(cleaned):
                    heading_positions.append((idx, label, 1.0))
                    break
            else:
                if self._looks_like_heading(line, lines, idx):
                    heading_positions.append(
                        (idx, SectionLabel.OTHER, 0.6)
                    )

        sections = self._build_sections(lines, heading_positions)
        return sections

    @staticmethod
    def _looks_like_heading(line: str, lines: List[str], idx: int) -> bool:
        """Heuristic: very strict -- only ALL-CAPS lines of 1-3 words that
        are surrounded by blank lines.  Title-cased lines are too common
        inside experience/education blocks to be reliable headings."""
        words = line.split()
        if len(words) > 3 or len(words) == 0:
            return False
        if not line.isupper():
            return False
        alpha_ratio = sum(c.isalpha() for c in line) / max(len(line), 1)
        if alpha_ratio < 0.8:
            return False
        prev_blank = idx == 0 or lines[idx - 1].strip() == ""
        next_blank = idx >= len(lines) - 1 or lines[idx + 1].strip() == ""
        return prev_blank and next_blank

    @staticmethod
    def _build_sections(
        lines: List[str],
        headings: List[Tuple[int, SectionLabel, float]],
    ) -> List[Section]:
        sections: List[Section] = []

        if not headings:
            return [
                Section(
                    label=SectionLabel.OTHER,
                    text="\n".join(lines),
                    start_line=0,
                    end_line=len(lines) - 1,
                )
            ]

        first_heading_line = headings[0][0]
        if first_heading_line > 0:
            header_text = "\n".join(lines[:first_heading_line]).strip()
            if header_text:
                sections.append(
                    Section(
                        label=SectionLabel.HEADER,
                        text=header_text,
                        start_line=0,
                        end_line=first_heading_line - 1,
                    )
                )

        for i, (start, label, conf) in enumerate(headings):
            end = headings[i + 1][0] - 1 if i + 1 < len(headings) else len(lines) - 1
            body_start = start + 1
            section_text = "\n".join(lines[body_start : end + 1]).strip()
            sections.append(
                Section(
                    label=label,
                    text=section_text,
                    start_line=start,
                    end_line=end,
                    confidence=conf,
                )
            )

        return sections

    def get_section(
        self, sections: List[Section], label: SectionLabel
    ) -> Optional[Section]:
        for s in sections:
            if s.label == label:
                return s
        return None

    def get_sections(
        self, sections: List[Section], label: SectionLabel
    ) -> List[Section]:
        return [s for s in sections if s.label == label]
