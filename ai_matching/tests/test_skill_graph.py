"""
Tests for the unified SkillGraph, SkillTaxonomy, SkillVectorizer,
and the hierarchy-aware matcher.

Style notes (real-world practices):
  - Fixtures via conftest.py instead of constructing objects per test.
  - @pytest.mark.parametrize for data-driven tests (one code path, many inputs).
  - Explicit edge-case and boundary tests.
  - Integration tests assert *relative* properties, not magic numbers.
"""

import pytest

from app.skills.skill_graph import SkillGraph, EXACT_MATCH_CREDIT
from app.skills.vectorizer import SkillVectorizer
from app.matching.matcher import match_student_to_internship
from tests.conftest import make_student, make_internship


# ===================================================================
# SkillGraph -- Synonym Resolution  (parametrized)
# ===================================================================

class TestSynonymResolution:
    @pytest.mark.parametrize("raw, expected", [
        ("js",       "JavaScript"),
        ("ml",       "Machine Learning"),
        ("k8s",      "Kubernetes"),
        ("py",       "Python"),
        ("ts",       "TypeScript"),
        ("reactjs",  "React"),
        ("postgres", "PostgreSQL"),
        ("nodejs",   "Node.js"),
        ("dl",       "Deep Learning"),
        ("sklearn",  "Scikit-learn"),
        ("tf",       "TensorFlow"),
        ("gcp",      "Google Cloud"),
        ("golang",   "Go"),
        ("cpp",      "C++"),
        ("csharp",   "C#"),
    ])
    def test_synonym_resolves(self, graph, raw, expected):
        assert graph.normalize(raw) == expected

    def test_unknown_skill_passes_through(self, graph):
        assert graph.normalize("SomeRandomTech") == "SomeRandomTech"

    def test_case_insensitive(self, graph):
        assert graph.normalize("PYTHON") == "Python"
        assert graph.normalize("react") == "React"
        assert graph.normalize("  PyTorch  ") == "PyTorch"

    def test_empty_string(self, graph):
        result = graph.normalize("")
        assert isinstance(result, str)

    def test_special_chars_in_skill(self, graph):
        assert graph.normalize("C++") == "C++"
        assert graph.normalize("c#") == "C#"
        assert graph.normalize("ci/cd") == "CI/CD"


# ===================================================================
# SkillGraph -- Hierarchy Lookups
# ===================================================================

class TestHierarchyLookups:
    @pytest.mark.parametrize("skill, expected_parent", [
        ("PyTorch",    "Deep Learning"),
        ("React",      "Frontend"),
        ("Django",     "Backend"),
        ("PostgreSQL", "Relational"),
        ("Docker",     "Containerization"),
        ("Pandas",     "Data Analysis"),
    ])
    def test_get_parent(self, graph, skill, expected_parent):
        assert graph.get_parent(skill) == expected_parent

    @pytest.mark.parametrize("skill, expected_domain", [
        ("PyTorch", "Data Science"),
        ("React",   "Web Development"),
        ("Docker",  "DevOps"),
        ("MongoDB", "Databases"),
        ("Flutter", "Mobile Development"),
    ])
    def test_get_domain(self, graph, skill, expected_domain):
        assert graph.get_domain(skill) == expected_domain

    def test_siblings_of_pytorch(self, graph):
        sibs = graph.get_siblings("PyTorch")
        assert "TensorFlow" in sibs
        assert "Keras" in sibs
        assert "PyTorch" not in sibs, "A skill should not be its own sibling"

    def test_children_of_deep_learning(self, graph):
        kids = graph.get_children("Deep Learning")
        assert {"PyTorch", "TensorFlow", "Keras"} <= kids

    def test_unknown_skill_returns_none(self, graph):
        assert graph.get_parent("FakeSkill123") is None
        assert graph.get_domain("FakeSkill123") is None

    def test_siblings_of_unknown_is_empty(self, graph):
        assert graph.get_siblings("FakeSkill123") == set()


# ===================================================================
# SkillGraph -- Hierarchy Distance & Credit
# ===================================================================

class TestHierarchyDistance:
    @pytest.mark.parametrize("a, b, expected", [
        ("Python",     "Python",     0),
        ("py",         "Python",     0),  # synonym resolves first
        ("PyTorch",    "TensorFlow", 1),  # siblings
        ("PyTorch",    "Pandas",     2),  # same domain, different category
        ("React",      "PyTorch",    3),  # unrelated domains
    ])
    def test_distance(self, graph, a, b, expected):
        assert graph.hierarchy_distance(a, b) == expected


class TestHierarchyCredit:
    @pytest.mark.parametrize("student_skill, required_skill, expected_credit", [
        ("Python",           "Python",         1.0),   # exact
        ("js",               "JavaScript",     1.0),   # synonym -> exact
        ("PyTorch",          "Deep Learning",  0.7),   # child -> parent
        ("Machine Learning", "Scikit-learn",   0.3),   # parent -> child
        ("PyTorch",          "TensorFlow",     0.5),   # sibling
        ("PyTorch",          "Pandas",         0.2),   # same domain
        ("React",            "PyTorch",        0.0),   # unrelated
    ])
    def test_credit(self, graph, student_skill, required_skill, expected_credit):
        assert graph.hierarchy_credit(student_skill, required_skill) == expected_credit


# ===================================================================
# SkillGraph -- Tech Stack Detection
# ===================================================================

class TestStackDetection:
    @pytest.mark.parametrize("skills, expected_stack", [
        ({"MongoDB", "Express.js", "React", "Node.js"}, "MERN"),
        ({"MongoDB", "Express.js", "Angular", "Node.js"}, "MEAN"),
        ({"Python", "Django", "PostgreSQL"}, "Django Stack"),
    ])
    def test_stack_detected(self, graph, skills, expected_stack):
        assert expected_stack in graph.detect_stacks(skills)

    def test_partial_stack_not_detected(self, graph):
        assert "MERN" not in graph.detect_stacks({"MongoDB", "React"})

    def test_superset_still_detects(self, graph):
        skills = {"MongoDB", "Express.js", "React", "Node.js", "Python", "AWS"}
        assert "MERN" in graph.detect_stacks(skills)

    def test_empty_skills_returns_empty(self, graph):
        assert graph.detect_stacks(set()) == []


# ===================================================================
# SkillGraph -- all_canonical_skills
# ===================================================================

class TestAllCanonicalSkills:
    def test_returns_nonempty_sorted_list(self, graph):
        skills = graph.all_canonical_skills()
        assert len(skills) > 50
        assert skills == sorted(skills), "Should be alphabetically sorted"

    @pytest.mark.parametrize("skill", [
        "Python", "React", "Docker", "PyTorch", "PostgreSQL",
    ])
    def test_known_skill_present(self, graph, skill):
        assert skill in set(graph.all_canonical_skills())


# ===================================================================
# SkillTaxonomy -- Backward Compatibility
# ===================================================================

class TestTaxonomyCompat:
    def test_normalize_delegates_to_graph(self, taxonomy):
        assert taxonomy.normalize("js") == "JavaScript"

    def test_normalize_skills_merges_duplicates(self, taxonomy):
        result = taxonomy.normalize_skills({"js": 3, "JavaScript": 5})
        assert result["JavaScript"] == 5
        assert len(result) == 1

    def test_hierarchy_credit_delegates(self, taxonomy):
        assert taxonomy.hierarchy_credit("PyTorch", "TensorFlow") == 0.5


# ===================================================================
# SkillVectorizer -- Expanded Index
# ===================================================================

class TestVectorizerExpansion:
    def test_expanded_index_is_superset(self):
        student = {"Python": 3}
        internship = {"Django": 2}
        base = SkillVectorizer.build_index(student, internship, expand_hierarchy=False)
        expanded = SkillVectorizer.build_index(student, internship, expand_hierarchy=True)
        assert set(base.keys()) <= set(expanded.keys())

    def test_sibling_appears_in_expanded_index(self):
        expanded = SkillVectorizer.build_index(
            {"React": 4}, {"Angular": 3}, expand_hierarchy=True,
        )
        assert "Vue" in expanded, "Sibling of React/Angular should appear"

    def test_vectorize_fills_siblings_fractionally(self):
        idx = SkillVectorizer.build_index(
            {"React": 4}, {"Angular": 3}, expand_hierarchy=True,
        )
        vec = SkillVectorizer(idx).vectorize({"React": 4}, expand=True)
        assert vec[idx["React"]] == 4.0
        if "Vue" in idx:
            assert 0 < vec[idx["Vue"]] < 4.0, "Sibling should get partial level"

    def test_no_expansion_leaves_siblings_zero(self):
        idx = SkillVectorizer.build_index(
            {"React": 4}, {"Angular": 3}, expand_hierarchy=True,
        )
        vec = SkillVectorizer(idx).vectorize({"React": 4}, expand=False)
        if "Vue" in idx:
            assert vec[idx["Vue"]] == 0.0


# ===================================================================
# Integration -- Hierarchy-Aware Matcher
#
# These test *relative* properties rather than magic score thresholds.
# ===================================================================

class TestMatcherIntegration:
    def test_exact_match_returns_matched(self):
        result = match_student_to_internship(
            make_student({"python": 4, "django": 3}),
            make_internship({"python": 3, "django": 2}),
        )
        assert result["status"] == "MATCHED"
        assert result["final_score"] > 0

    def test_exact_match_scores_higher_than_sibling(self):
        exact = match_student_to_internship(
            make_student({"PyTorch": 4, "Python": 3}),
            make_internship({"PyTorch": 3, "Python": 3}),
        )
        sibling = match_student_to_internship(
            make_student({"TensorFlow": 4, "Python": 3}),
            make_internship({"PyTorch": 3, "Python": 3}),
        )
        assert exact["final_score"] > sibling["final_score"]

    def test_sibling_scores_higher_than_unrelated(self):
        sibling = match_student_to_internship(
            make_student({"TensorFlow": 4, "Python": 3}),
            make_internship({"PyTorch": 3, "Python": 3}),
        )
        unrelated = match_student_to_internship(
            make_student({"React": 4, "Python": 3}),
            make_internship({"PyTorch": 3, "Python": 3}),
        )
        assert sibling["final_score"] > unrelated["final_score"]

    def test_ml_student_gets_partial_credit_for_rag(self):
        result = match_student_to_internship(
            make_student({"Machine Learning": 4, "PyTorch": 3, "Python": 4}),
            make_internship({"RAG": 3, "Python": 3}),
        )
        assert result["status"] == "MATCHED"
        partial_skills = [p["required"] for p in result["matched_skills"]["partial"]]
        assert "RAG" in partial_skills

    def test_child_to_parent_gives_0_7_credit(self):
        result = match_student_to_internship(
            make_student({"PyTorch": 4, "Python": 3}),
            make_internship({"Deep Learning": 3, "Python": 3}),
        )
        dl = [p for p in result["matched_skills"]["partial"] if p["required"] == "Deep Learning"]
        assert len(dl) == 1
        assert dl[0]["credit"] == 0.7

    def test_synonym_normalization_in_matching(self):
        result = match_student_to_internship(
            make_student({"js": 4}),
            make_internship({"JavaScript": 3}),
        )
        assert result["status"] == "MATCHED"
        assert "JavaScript" in result["matched_skills"]["exact"]

    def test_detected_stacks_in_output(self):
        result = match_student_to_internship(
            make_student({"MongoDB": 3, "Express.js": 3, "React": 4, "Node.js": 3}),
            make_internship({"React": 3}),
        )
        assert "MERN" in result["detected_stacks"]

    def test_completely_unrelated_skills_score_low(self):
        result = match_student_to_internship(
            make_student({"Figma": 4, "Photoshop": 3}),
            make_internship({"PyTorch": 3, "Python": 3}),
        )
        assert result["final_score"] < 30
