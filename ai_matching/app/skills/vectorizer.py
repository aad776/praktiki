import numpy as np
from typing import Dict, List


class SkillVectorizer:
    """
    Converts skill dictionaries into numeric vectors.
    """

    def __init__(self, skill_index: Dict[str, int]):
        self.skill_index = skill_index

    @staticmethod
    def build_index(
        student_skills: Dict[str, int],
        internship_skills: Dict[str, int]
    ) -> Dict[str, int]:
        """
        Create a global skill index from student & internship skills.
        """
        all_skills: List[str] = sorted(
            set(student_skills.keys()) | set(internship_skills.keys())
        )

        return {skill: idx for idx, skill in enumerate(all_skills)}

    def vectorize(self, skills: Dict[str, int]) -> np.ndarray:
        """
        Convert skills into a vector using the skill index.
        """
        vector = np.zeros(len(self.skill_index))

        for skill, level in skills.items():
            if skill in self.skill_index:
                vector[self.skill_index[skill]] = level

        return vector
