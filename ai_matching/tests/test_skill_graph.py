"""
Tests for the unified SkillGraph, the refactored SkillTaxonomy,
the hierarchy-aware matcher, and the enhanced vectorizer.
"""

import sys
import os

sys.path.insert(
    0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
)

from app.skills.skill_graph import SkillGraph, get_skill_graph
from app.skills.taxonomy import SkillTaxonomy
from app.skills.vectorizer import SkillVectorizer
from app.matching.matcher import match_student_to_internship
from app.models.students import Student
from app.models.internship import Internship


# ===================================================================
# SkillGraph -- Synonym Resolution
# ===================================================================

class TestSynonymResolution:
    def test_js_resolves_to_javascript(self):
        g = SkillGraph()
        assert g.normalize("js") == "JavaScript"

    def test_ml_resolves_to_machine_learning(self):
        g = SkillGraph()
        assert g.normalize("ml") == "Machine Learning"

    def test_k8s_resolves_to_kubernetes(self):
        g = SkillGraph()
        assert g.normalize("k8s") == "Kubernetes"

    def test_py_resolves_to_python(self):
        g = SkillGraph()
        assert g.normalize("py") == "Python"

    def test_ts_resolves_to_typescript(self):
        g = SkillGraph()
        assert g.normalize("ts") == "TypeScript"

    def test_reactjs_resolves_to_react(self):
        g = SkillGraph()
        assert g.normalize("reactjs") == "React"

    def test_postgres_resolves_to_postgresql(self):
        g = SkillGraph()
        assert g.normalize("postgres") == "PostgreSQL"

    def test_nodejs_resolves_to_node_js(self):
        g = SkillGraph()
        assert g.normalize("nodejs") == "Node.js"

    def test_dl_resolves_to_deep_learning(self):
        g = SkillGraph()
        assert g.normalize("dl") == "Deep Learning"

    def test_sklearn_resolves_to_scikit_learn(self):
        g = SkillGraph()
        assert g.normalize("sklearn") == "Scikit-learn"

    def test_tf_resolves_to_tensorflow(self):
        g = SkillGraph()
        assert g.normalize("tf") == "TensorFlow"

    def test_gcp_resolves_to_google_cloud(self):
        g = SkillGraph()
        assert g.normalize("gcp") == "Google Cloud"

    def test_unknown_skill_passes_through(self):
        g = SkillGraph()
        assert g.normalize("SomeRandomTech") == "SomeRandomTech"

    def test_case_insensitive(self):
        g = SkillGraph()
        assert g.normalize("PYTHON") == "Python"
        assert g.normalize("React") == "React"


# ===================================================================
# SkillGraph -- Hierarchy Lookups
# ===================================================================

class TestHierarchyLookups:
    def test_pytorch_parent_is_deep_learning(self):
        g = SkillGraph()
        assert g.get_parent("PyTorch") == "Deep Learning"

    def test_pytorch_domain_is_data_science(self):
        g = SkillGraph()
        assert g.get_domain("PyTorch") == "Data Science"

    def test_react_parent_is_frontend(self):
        g = SkillGraph()
        assert g.get_parent("React") == "Frontend"

    def test_react_domain_is_web_development(self):
        g = SkillGraph()
        assert g.get_domain("React") == "Web Development"

    def test_siblings_of_pytorch(self):
        g = SkillGraph()
        sibs = g.get_siblings("PyTorch")
        assert "TensorFlow" in sibs
        assert "Keras" in sibs
        assert "PyTorch" not in sibs

    def test_children_of_deep_learning(self):
        g = SkillGraph()
        kids = g.get_children("Deep Learning")
        assert "PyTorch" in kids
        assert "TensorFlow" in kids
        assert "Keras" in kids

    def test_unknown_skill_returns_none(self):
        g = SkillGraph()
        assert g.get_parent("SomeRandomTech") is None
        assert g.get_domain("SomeRandomTech") is None

    def test_siblings_of_unknown_is_empty(self):
        g = SkillGraph()
        assert g.get_siblings("SomeRandomTech") == set()


# ===================================================================
# SkillGraph -- Hierarchy Distance & Credit
# ===================================================================

class TestHierarchyDistance:
    def test_same_skill_distance_zero(self):
        g = SkillGraph()
        assert g.hierarchy_distance("Python", "Python") == 0
        assert g.hierarchy_distance("py", "Python") == 0

    def test_siblings_distance_one(self):
        g = SkillGraph()
        assert g.hierarchy_distance("PyTorch", "TensorFlow") == 1

    def test_same_domain_distance_two(self):
        g = SkillGraph()
        # PyTorch is Deep Learning, Pandas is Data Analysis -- both Data Science
        assert g.hierarchy_distance("PyTorch", "Pandas") == 2

    def test_unrelated_distance_three(self):
        g = SkillGraph()
        assert g.hierarchy_distance("React", "PyTorch") == 3


class TestHierarchyCredit:
    def test_exact_match_is_1(self):
        g = SkillGraph()
        assert g.hierarchy_credit("Python", "Python") == 1.0

    def test_synonym_exact_match(self):
        g = SkillGraph()
        assert g.hierarchy_credit("js", "JavaScript") == 1.0

    def test_child_to_parent_credit(self):
        """Student has PyTorch (child), job wants Deep Learning (category)."""
        g = SkillGraph()
        credit = g.hierarchy_credit("PyTorch", "Deep Learning")
        assert credit == 0.7

    def test_parent_to_child_credit(self):
        """Student has Machine Learning (category name used as skill),
        job wants Scikit-learn (child)."""
        g = SkillGraph()
        credit = g.hierarchy_credit("Machine Learning", "Scikit-learn")
        assert credit == 0.3

    def test_sibling_credit(self):
        g = SkillGraph()
        credit = g.hierarchy_credit("PyTorch", "TensorFlow")
        assert credit == 0.5

    def test_same_domain_credit(self):
        g = SkillGraph()
        credit = g.hierarchy_credit("PyTorch", "Pandas")
        assert credit == 0.2

    def test_unrelated_credit_is_zero(self):
        g = SkillGraph()
        assert g.hierarchy_credit("React", "PyTorch") == 0.0


# ===================================================================
# SkillGraph -- Tech Stack Detection
# ===================================================================

class TestStackDetection:
    def test_mern_detected(self):
        g = SkillGraph()
        skills = {"MongoDB", "Express.js", "React", "Node.js", "Python"}
        stacks = g.detect_stacks(skills)
        assert "MERN" in stacks

    def test_mean_detected(self):
        g = SkillGraph()
        skills = {"MongoDB", "Express.js", "Angular", "Node.js"}
        stacks = g.detect_stacks(skills)
        assert "MEAN" in stacks

    def test_django_stack_detected(self):
        g = SkillGraph()
        skills = {"Python", "Django", "PostgreSQL"}
        stacks = g.detect_stacks(skills)
        assert "Django Stack" in stacks

    def test_partial_stack_not_detected(self):
        g = SkillGraph()
        skills = {"MongoDB", "React"}
        stacks = g.detect_stacks(skills)
        assert "MERN" not in stacks

    def test_empty_skills_returns_empty(self):
        g = SkillGraph()
        assert g.detect_stacks(set()) == []


# ===================================================================
# SkillGraph -- all_canonical_skills
# ===================================================================

class TestAllCanonicalSkills:
    def test_returns_nonempty_list(self):
        g = SkillGraph()
        skills = g.all_canonical_skills()
        assert len(skills) > 50

    def test_known_skills_present(self):
        g = SkillGraph()
        skills = set(g.all_canonical_skills())
        for s in ["Python", "React", "Docker", "PyTorch", "PostgreSQL"]:
            assert s in skills, f"{s} should be in all_canonical_skills"


# ===================================================================
# SkillTaxonomy -- Backward Compatibility
# ===================================================================

class TestTaxonomyCompat:
    def test_normalize_single_skill(self):
        t = SkillTaxonomy()
        assert t.normalize("js") == "JavaScript"
        assert t.normalize("py") == "Python"

    def test_normalize_skills_dict_merges_duplicates(self):
        t = SkillTaxonomy()
        result = t.normalize_skills({"js": 3, "JavaScript": 5})
        assert result["JavaScript"] == 5

    def test_hierarchy_credit_delegates(self):
        t = SkillTaxonomy()
        assert t.hierarchy_credit("PyTorch", "TensorFlow") == 0.5


# ===================================================================
# SkillVectorizer -- Expanded Index
# ===================================================================

class TestVectorizerExpansion:
    def test_expanded_index_larger_than_base(self):
        student = {"Python": 3}
        internship = {"Django": 2}
        base = SkillVectorizer.build_index(student, internship, expand_hierarchy=False)
        expanded = SkillVectorizer.build_index(student, internship, expand_hierarchy=True)
        assert len(expanded) >= len(base)

    def test_sibling_appears_in_expanded_index(self):
        student = {"React": 4}
        internship = {"Angular": 3}
        expanded = SkillVectorizer.build_index(student, internship, expand_hierarchy=True)
        assert "Vue" in expanded

    def test_vectorize_with_expansion_fills_siblings(self):
        student = {"React": 4}
        internship = {"Angular": 3}
        idx = SkillVectorizer.build_index(student, internship, expand_hierarchy=True)
        v = SkillVectorizer(idx)
        vec = v.vectorize({"React": 4}, expand=True)
        assert vec[idx["React"]] == 4.0
        # Vue is a sibling; should have a fractional level
        if "Vue" in idx:
            assert vec[idx["Vue"]] > 0


# ===================================================================
# Integration -- Hierarchy-Aware Matcher
# ===================================================================

class TestMatcherIntegration:
    def _make_student(self, skills, **kwargs):
        defaults = dict(id=1, year=3, location="Delhi", preferences={})
        defaults.update(kwargs)
        return Student(skills=skills, **defaults)

    def _make_internship(self, required_skills, **kwargs):
        defaults = dict(id=1, min_year=2, location="Delhi", is_remote=True)
        defaults.update(kwargs)
        return Internship(required_skills=required_skills, **defaults)

    def test_exact_match_scores_high(self):
        student = self._make_student({"python": 4, "django": 3})
        internship = self._make_internship({"python": 3, "django": 2})
        result = match_student_to_internship(student, internship)
        assert result["status"] == "MATCHED"
        assert result["final_score"] > 50

    def test_ml_student_matches_rag_job(self):
        """A student with ML + PyTorch should get partial credit for a
        job requiring RAG (both under Data Science)."""
        student = self._make_student({
            "Machine Learning": 4,
            "PyTorch": 3,
            "Python": 4,
        })
        internship = self._make_internship({
            "RAG": 3,
            "Python": 3,
        })
        result = match_student_to_internship(student, internship)
        assert result["status"] == "MATCHED"
        assert result["final_score"] > 0
        partials = result["matched_skills"]["partial"]
        partial_skills = [p["required"] for p in partials]
        assert "RAG" in partial_skills

    def test_pytorch_gives_credit_for_deep_learning(self):
        """Student: PyTorch (child), Job: Deep Learning (category)."""
        student = self._make_student({"PyTorch": 4, "Python": 3})
        internship = self._make_internship({"Deep Learning": 3, "Python": 3})
        result = match_student_to_internship(student, internship)
        assert result["status"] == "MATCHED"
        partials = result["matched_skills"]["partial"]
        dl_match = [p for p in partials if p["required"] == "Deep Learning"]
        assert len(dl_match) == 1
        assert dl_match[0]["credit"] == 0.7

    def test_sibling_match_gives_half_credit(self):
        """Student: TensorFlow, Job: PyTorch  (siblings under Deep Learning)."""
        student = self._make_student({"TensorFlow": 4, "Python": 3})
        internship = self._make_internship({"PyTorch": 3, "Python": 3})
        result = match_student_to_internship(student, internship)
        assert result["status"] == "MATCHED"
        partials = result["matched_skills"]["partial"]
        pt = [p for p in partials if p["required"] == "PyTorch"]
        assert len(pt) == 1
        assert pt[0]["credit"] == 0.5

    def test_detected_stacks_in_output(self):
        student = self._make_student({
            "MongoDB": 3, "Express.js": 3, "React": 4, "Node.js": 3,
        })
        internship = self._make_internship({"React": 3})
        result = match_student_to_internship(student, internship)
        assert "MERN" in result["detected_stacks"]

    def test_synonym_normalization_in_matching(self):
        """'js' in student skills should match 'JavaScript' in job."""
        student = self._make_student({"js": 4})
        internship = self._make_internship({"JavaScript": 3})
        result = match_student_to_internship(student, internship)
        assert result["status"] == "MATCHED"
        assert "JavaScript" in result["matched_skills"]["exact"]
