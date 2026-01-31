from dataclasses import dataclass, field
from typing import Dict


@dataclass
class Student:
    """
    Represents a student profile used for AI matching.
    Phase-1: Pure data container (no logic).
    """

    id: int
    skills: Dict[str, int]
    year: int
    location: str
    preferences: Dict[str, str] = field(default_factory=dict)

    def _get_matching_skill_key(self, skill_name: str) -> str:
        """Helper to find skill key case-insensitively."""
        target = skill_name.lower()
        for key in self.skills:
            if key.lower() == target:
                return key
        return None

    def has_skill(self, skill_name: str) -> bool:
        """Check if student has a given skill."""
        return self._get_matching_skill_key(skill_name) is not None

    def skill_level(self, skill_name: str) -> int:
        """Return level of a skill, 0 if not present."""
        key = self._get_matching_skill_key(skill_name)
        if key:
            return self.skills[key]
        return 0
