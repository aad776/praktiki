from typing import Dict, List, Optional, Set

from app.skills.skill_graph import SkillGraph, get_skill_graph


class SkillTaxonomy:
    """
    Handles skill normalization, hierarchy lookups, and partial-credit scoring.
    Delegates to the unified SkillGraph singleton.
    Phase-1: Static taxonomy (no DB).
    """

    def __init__(self) -> None:
        self.graph: SkillGraph = get_skill_graph()

    def normalize(self, skill_name: str) -> str:
        return self.graph.normalize(skill_name)

    def normalize_skills(self, skills: Dict[str, int]) -> Dict[str, int]:
        normalized: Dict[str, int] = {}
        for skill, level in skills.items():
            std_skill = self.normalize(skill)
            normalized[std_skill] = max(level, normalized.get(std_skill, 0))
        return normalized

    def get_parent(self, skill: str) -> Optional[str]:
        return self.graph.get_parent(skill)

    def get_domain(self, skill: str) -> Optional[str]:
        return self.graph.get_domain(skill)

    def get_siblings(self, skill: str) -> Set[str]:
        return self.graph.get_siblings(skill)

    def get_children(self, category: str) -> Set[str]:
        return self.graph.get_children(category)

    def detect_stacks(self, skills: Set[str]) -> List[str]:
        return self.graph.detect_stacks(skills)

    def hierarchy_credit(self, student_skill: str, required_skill: str) -> float:
        return self.graph.hierarchy_credit(student_skill, required_skill)

    def hierarchy_distance(self, a: str, b: str) -> int:
        return self.graph.hierarchy_distance(a, b)
