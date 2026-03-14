"""
Segmented Processor  (Phase 3 -- Handling Long Documents)

Addresses the 512-token limit of transformer models by:
  1. Splitting detected sections into overlapping windows of configurable
     max-token size.
  2. Running the appropriate extractor on each window.
  3. Merging / deduplicating results across windows.

This ensures skills, experience entries, and education details at the end
of a 5-page resume are not silently dropped.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import List

from section_detector import Section

logger = logging.getLogger(__name__)

DEFAULT_MAX_TOKENS = 450
DEFAULT_OVERLAP_TOKENS = 50


@dataclass
class TextWindow:
    """A slice of a section's text with positional metadata."""
    text: str
    section_label: str
    window_index: int
    total_windows: int


class SegmentedProcessor:
    """Splits long sections into overlapping token windows."""

    def __init__(
        self,
        max_tokens: int = DEFAULT_MAX_TOKENS,
        overlap_tokens: int = DEFAULT_OVERLAP_TOKENS,
    ):
        self.max_tokens = max_tokens
        self.overlap_tokens = overlap_tokens

    def create_windows(self, section: Section) -> List[TextWindow]:
        tokens = self._tokenize(section.text)
        if not tokens:
            return []

        if len(tokens) <= self.max_tokens:
            return [
                TextWindow(
                    text=section.text,
                    section_label=section.label.value,
                    window_index=0,
                    total_windows=1,
                )
            ]

        stride = max(self.max_tokens - self.overlap_tokens, 1)
        windows: List[TextWindow] = []
        start = 0
        while start < len(tokens):
            end = min(start + self.max_tokens, len(tokens))
            chunk_text = " ".join(tokens[start:end])
            windows.append(
                TextWindow(
                    text=chunk_text,
                    section_label=section.label.value,
                    window_index=len(windows),
                    total_windows=0,
                )
            )
            if end >= len(tokens):
                break
            start += stride

        for w in windows:
            w.total_windows = len(windows)

        return windows

    def create_windows_from_sections(
        self, sections: List[Section]
    ) -> List[TextWindow]:
        all_windows: List[TextWindow] = []
        for section in sections:
            all_windows.extend(self.create_windows(section))
        return all_windows

    @staticmethod
    def _tokenize(text: str) -> List[str]:
        return re.findall(r"\S+", text)

    @staticmethod
    def merge_skill_lists(*skill_lists: List[str]) -> List[str]:
        seen_lower: dict[str, str] = {}
        for skills in skill_lists:
            for s in skills:
                key = s.lower()
                if key not in seen_lower:
                    seen_lower[key] = s
        return sorted(seen_lower.values())
