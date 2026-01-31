from dataclasses import dataclass
from typing import Dict


@dataclass
class Internship:
    """
    Represents an internship opportunity.
    Used as the target entity for student matching.
    """

    id: int
    required_skills: Dict[str, int]
    min_year: int
    location: str
    is_remote: bool

    def requires_skill(self, skill_name: str) -> bool:
        """Check if internship requires a given skill."""
        return skill_name in self.required_skills

    def required_skill_level(self, skill_name: str) -> int:
        """Return required level for a skill, 0 if not required."""
        return self.required_skills.get(skill_name, 0)
