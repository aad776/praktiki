import numpy as np
from typing import Dict, List, Set

from app.skills.skill_graph import get_skill_graph

SIBLING_LEVEL_FRACTION = 0.3
PARENT_LEVEL_FRACTION = 0.2


class SkillVectorizer:
    """
    Converts skill dictionaries into numeric vectors.

    When ``expand_hierarchy=True`` (the default), the skill index is widened
    to include siblings and parent-category skills from the SkillGraph so
    that cosine similarity captures partial semantic overlap even between
    skills that were not explicitly listed.
    """

    def __init__(self, skill_index: Dict[str, int]):
        self.skill_index = skill_index

    @staticmethod
    def build_index(
        student_skills: Dict[str, int],
        internship_skills: Dict[str, int],
        expand_hierarchy: bool = True,
    ) -> Dict[str, int]:
        """
        Create a global skill index from student & internship skills,
        optionally expanded with related skills from the hierarchy.
        """
        base: Set[str] = set(student_skills.keys()) | set(internship_skills.keys())

        if expand_hierarchy:
            graph = get_skill_graph()
            expanded: Set[str] = set()
            for skill in base:
                expanded.update(graph.get_siblings(skill))
                parent = graph.get_parent(skill)
                if parent:
                    expanded.add(parent)
            base |= expanded

        all_skills: List[str] = sorted(base)
        return {skill: idx for idx, skill in enumerate(all_skills)}

    def vectorize(self, skills: Dict[str, int], expand: bool = True) -> np.ndarray:
        """
        Convert skills into a vector using the skill index.

        When *expand* is True, sibling and parent skills receive a fraction
        of the original skill's level so the vector implicitly represents
        related competencies.
        """
        vector = np.zeros(len(self.skill_index))

        for skill, level in skills.items():
            if skill in self.skill_index:
                vector[self.skill_index[skill]] = max(
                    vector[self.skill_index[skill]], level
                )

            if not expand:
                continue

            graph = get_skill_graph()
            for sibling in graph.get_siblings(skill):
                if sibling in self.skill_index:
                    implied = level * SIBLING_LEVEL_FRACTION
                    vector[self.skill_index[sibling]] = max(
                        vector[self.skill_index[sibling]], implied
                    )

            parent = graph.get_parent(skill)
            if parent and parent in self.skill_index:
                implied = level * PARENT_LEVEL_FRACTION
                vector[self.skill_index[parent]] = max(
                    vector[self.skill_index[parent]], implied
                )

        return vector
