from typing import Dict


class SkillTaxonomy:
    """
    Handles skill normalization and aliases.
    Phase-1: Static taxonomy (no DB).
    """

    def __init__(self):
        self.skill_aliases: Dict[str, str] = {
            "py": "python",
            "python3": "python",
            "js": "javascript",
            "node": "javascript",
            "reactjs": "react",
            "sql": "sql",
            "mysql": "sql",
            "postgres": "sql"
        }

    def normalize(self, skill_name: str) -> str:
        """
        Convert skill name to standardized format.
        """
        skill = skill_name.lower().strip()
        return self.skill_aliases.get(skill, skill)

    def normalize_skills(self, skills: Dict[str, int]) -> Dict[str, int]:
        """
        Normalize a skill dictionary.
        """
        normalized: Dict[str, int] = {}

        for skill, level in skills.items():
            std_skill = self.normalize(skill)
            normalized[std_skill] = max(level, normalized.get(std_skill, 0))

        return normalized
