"""
Shared fixtures for the ai_matching test suite.

Pytest discovers this file automatically -- no manual imports needed.
"""

import sys
import os

import pytest

sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)

from app.skills.skill_graph import SkillGraph
from app.skills.taxonomy import SkillTaxonomy
from app.models.students import Student
from app.models.internship import Internship


@pytest.fixture(scope="session")
def graph():
    """Single SkillGraph instance shared across the entire test session."""
    return SkillGraph()


@pytest.fixture(scope="session")
def taxonomy():
    return SkillTaxonomy()


def make_student(skills, **overrides):
    defaults = dict(id=1, year=3, location="Delhi", preferences={})
    defaults.update(overrides)
    return Student(skills=skills, **defaults)


def make_internship(required_skills, **overrides):
    defaults = dict(id=1, min_year=2, location="Delhi", is_remote=True)
    defaults.update(overrides)
    return Internship(required_skills=required_skills, **defaults)
