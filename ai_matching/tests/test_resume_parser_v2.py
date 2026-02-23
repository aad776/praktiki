"""
Tests for Phase 3-5 resume parser features:
  - Section detection
  - Segmented processing (long documents)
  - Relation extraction (entity grouping)
  - Education extraction
  - Fuzzy / typo matching in skills
"""

import sys
import os

_RESUME_PARSER_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "resume_parser")
)
_AI_MATCHING_ROOT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..")
)
sys.path.insert(0, _RESUME_PARSER_DIR)
sys.path.insert(0, _AI_MATCHING_ROOT)


# ===================================================================
# Section Detector
# ===================================================================

from section_detector import SectionDetector, SectionLabel


SAMPLE_RESUME = """\
John Doe
john.doe@example.com
+1-555-123-4567

SUMMARY
Experienced software engineer with 5+ years of backend development.

WORK EXPERIENCE

Senior Software Engineer
Google Inc.
2021 - Present
Led backend migration to microservices architecture.

Software Engineer
Amazon
2018 - 2021
Built scalable data pipelines.

EDUCATION

B.Tech in Computer Science
IIT Delhi
2014 - 2018
GPA: 9.1/10

SKILLS
Python, JavaScript, React, Node.js, Docker, Kubernetes, AWS, PostgreSQL

PROJECTS
Resume Parser - Built a production-grade resume parser using NLP.
Chat App - Real-time chat application using WebSockets.

CERTIFICATIONS
AWS Solutions Architect - Amazon Web Services, 2022
"""


class TestSectionDetector:
    def test_detects_all_sections(self):
        detector = SectionDetector()
        sections = detector.detect(SAMPLE_RESUME)
        labels = {s.label for s in sections}

        assert SectionLabel.HEADER in labels
        assert SectionLabel.SUMMARY in labels
        assert SectionLabel.EXPERIENCE in labels
        assert SectionLabel.EDUCATION in labels
        assert SectionLabel.SKILLS in labels
        assert SectionLabel.PROJECTS in labels
        assert SectionLabel.CERTIFICATIONS in labels

    def test_header_contains_contact_info(self):
        detector = SectionDetector()
        sections = detector.detect(SAMPLE_RESUME)
        header = detector.get_section(sections, SectionLabel.HEADER)
        assert header is not None
        assert "john.doe@example.com" in header.text
        assert "John Doe" in header.text

    def test_experience_section_has_both_jobs(self):
        detector = SectionDetector()
        sections = detector.detect(SAMPLE_RESUME)
        exp = detector.get_section(sections, SectionLabel.EXPERIENCE)
        assert exp is not None
        assert "Google" in exp.text
        assert "Amazon" in exp.text

    def test_skills_section_has_skills(self):
        detector = SectionDetector()
        sections = detector.detect(SAMPLE_RESUME)
        skills_sec = detector.get_section(sections, SectionLabel.SKILLS)
        assert skills_sec is not None
        assert "Python" in skills_sec.text

    def test_education_section_has_degree(self):
        detector = SectionDetector()
        sections = detector.detect(SAMPLE_RESUME)
        edu = detector.get_section(sections, SectionLabel.EDUCATION)
        assert edu is not None
        assert "B.Tech" in edu.text

    def test_empty_text_returns_single_other(self):
        detector = SectionDetector()
        sections = detector.detect("")
        assert len(sections) == 1
        assert sections[0].label == SectionLabel.OTHER

    def test_no_headings_returns_single_other(self):
        detector = SectionDetector()
        sections = detector.detect("Just some random text with no headings.")
        assert len(sections) >= 1

    def test_get_sections_plural(self):
        detector = SectionDetector()
        sections = detector.detect(SAMPLE_RESUME)
        exp_sections = detector.get_sections(sections, SectionLabel.EXPERIENCE)
        assert len(exp_sections) >= 1


# ===================================================================
# Segmented Processor
# ===================================================================

from segmented_processor import SegmentedProcessor
from section_detector import Section


class TestSegmentedProcessor:
    def test_short_text_single_window(self):
        proc = SegmentedProcessor(max_tokens=100)
        section = Section(
            label=SectionLabel.SKILLS,
            text="Python JavaScript React",
            start_line=0, end_line=0,
        )
        windows = proc.create_windows(section)
        assert len(windows) == 1
        assert windows[0].text == "Python JavaScript React"

    def test_long_text_multiple_windows(self):
        proc = SegmentedProcessor(max_tokens=10, overlap_tokens=3)
        long_text = " ".join([f"word{i}" for i in range(50)])
        section = Section(
            label=SectionLabel.EXPERIENCE,
            text=long_text,
            start_line=0, end_line=0,
        )
        windows = proc.create_windows(section)
        assert len(windows) > 1
        for w in windows:
            assert w.total_windows == len(windows)

    def test_overlap_between_windows(self):
        proc = SegmentedProcessor(max_tokens=10, overlap_tokens=3)
        words = [f"w{i}" for i in range(20)]
        section = Section(
            label=SectionLabel.OTHER,
            text=" ".join(words),
            start_line=0, end_line=0,
        )
        windows = proc.create_windows(section)
        assert len(windows) >= 2
        w0_words = set(windows[0].text.split())
        w1_words = set(windows[1].text.split())
        assert len(w0_words & w1_words) > 0

    def test_merge_skill_lists_deduplicates(self):
        merged = SegmentedProcessor.merge_skill_lists(
            ["Python", "React"],
            ["python", "Docker"],
            ["React", "AWS"],
        )
        lower_set = {s.lower() for s in merged}
        assert len(lower_set) == 4

    def test_empty_section(self):
        proc = SegmentedProcessor()
        section = Section(
            label=SectionLabel.SKILLS, text="", start_line=0, end_line=0,
        )
        assert proc.create_windows(section) == []


# ===================================================================
# Relation Extractor  (Entity Grouping)
# ===================================================================

from relation_extractor import RelationExtractor


EXPERIENCE_TEXT = """\
Senior Software Engineer
Google Inc.
2021 - Present
Led backend migration to microservices.

Software Engineer
Amazon
2018 - 2021
Built data pipelines using Python and Spark.
"""

EDUCATION_TEXT = """\
B.Tech in Computer Science
IIT Delhi
2014 - 2018
GPA: 9.1/10

M.S. in Machine Learning
Stanford University
2018 - 2020
"""


class TestRelationExtractor:
    def test_experience_groups_detected(self):
        re_ext = RelationExtractor()
        groups = re_ext.extract_experience_groups(EXPERIENCE_TEXT)
        assert len(groups) >= 2

    def test_experience_group_has_date(self):
        re_ext = RelationExtractor()
        groups = re_ext.extract_experience_groups(EXPERIENCE_TEXT)
        dates = [g.get("DATE") for g in groups]
        assert any(d is not None for d in dates)

    def test_experience_group_has_title(self):
        re_ext = RelationExtractor()
        groups = re_ext.extract_experience_groups(EXPERIENCE_TEXT)
        titles = [g.get("JOB_TITLE") for g in groups]
        assert any(t is not None for t in titles)

    def test_education_groups_detected(self):
        re_ext = RelationExtractor()
        groups = re_ext.extract_education_groups(EDUCATION_TEXT)
        assert len(groups) >= 2

    def test_education_group_has_degree(self):
        re_ext = RelationExtractor()
        groups = re_ext.extract_education_groups(EDUCATION_TEXT)
        degrees = [g.get("DEGREE") for g in groups]
        assert any(d is not None for d in degrees)

    def test_empty_text_returns_empty(self):
        re_ext = RelationExtractor()
        assert re_ext.extract_experience_groups("") == []
        assert re_ext.extract_education_groups("") == []


# ===================================================================
# Education Extractor
# ===================================================================

from education_extractor import EducationExtractor


class TestEducationExtractor:
    def test_extracts_entries(self):
        ext = EducationExtractor()
        entries = ext.extract(EDUCATION_TEXT)
        assert len(entries) >= 1

    def test_entry_has_degree(self):
        ext = EducationExtractor()
        entries = ext.extract(EDUCATION_TEXT)
        degrees = [e.degree for e in entries if e.degree]
        assert len(degrees) >= 1

    def test_entry_has_year(self):
        ext = EducationExtractor()
        entries = ext.extract(EDUCATION_TEXT)
        years = [e.year for e in entries if e.year]
        assert len(years) >= 1

    def test_to_dict(self):
        ext = EducationExtractor()
        entries = ext.extract(EDUCATION_TEXT)
        for entry in entries:
            d = entry.to_dict()
            assert "degree" in d
            assert "institution" in d
            assert "year" in d

    def test_empty_text(self):
        ext = EducationExtractor()
        entries = ext.extract("")
        assert entries == []

    def test_fallback_on_simple_text(self):
        ext = EducationExtractor()
        entries = ext.extract("Bachelor of Science from MIT, 2020")
        assert len(entries) >= 1


# ===================================================================
# Fuzzy Matching (skills_extractor)
# ===================================================================

class TestFuzzyMatching:
    """These tests verify the fuzzy matcher catches common typos."""

    def test_pyton_matches_python(self):
        from rapidfuzz import fuzz, process as rfprocess

        skill_list = ["Python", "JavaScript", "React", "Docker"]
        skill_lower_map = {s.lower(): s for s in skill_list}
        choices = list(skill_lower_map.keys())

        result = rfprocess.extractOne(
            "pyton", choices, scorer=fuzz.WRatio, score_cutoff=85
        )
        assert result is not None
        assert skill_lower_map[result[0]] == "Python"

    def test_kuberntes_matches_kubernetes(self):
        from rapidfuzz import fuzz, process as rfprocess

        skill_list = ["Kubernetes", "Docker", "AWS"]
        choices = [s.lower() for s in skill_list]

        result = rfprocess.extractOne(
            "kuberntes", choices, scorer=fuzz.WRatio, score_cutoff=85
        )
        assert result is not None
        assert result[0] == "kubernetes"

    def test_exact_match_not_added_as_fuzzy(self):
        from rapidfuzz import fuzz, process as rfprocess

        skill_list = ["Python"]
        choices = [s.lower() for s in skill_list]

        result = rfprocess.extractOne(
            "python", choices, scorer=fuzz.WRatio, score_cutoff=85
        )
        assert result is not None
        assert result[0] == "python"

    def test_unrelated_word_no_match(self):
        from rapidfuzz import fuzz, process as rfprocess

        skill_list = ["Python", "JavaScript"]
        choices = [s.lower() for s in skill_list]

        result = rfprocess.extractOne(
            "elephant", choices, scorer=fuzz.WRatio, score_cutoff=85
        )
        assert result is None


# ===================================================================
# Schemas
# ===================================================================

from schemas import ResumeData, Education, FieldConfidence, SectionInfo


class TestSchemas:
    def test_resume_data_with_education(self):
        data = ResumeData(
            name="Alice",
            education=[Education(degree="B.S.", institution="MIT", year="2020")],
        )
        assert len(data.education) == 1
        assert data.education[0].degree == "B.S."

    def test_field_confidence(self):
        conf = FieldConfidence(name=0.9, email=1.0, phone=0.0, skills=0.8,
                               experience=0.5, education=1.0)
        assert conf.name == 0.9

    def test_section_info(self):
        si = SectionInfo(label="skills", start_line=10, end_line=15, confidence=0.95)
        assert si.label == "skills"

    def test_skill_dedup(self):
        data = ResumeData(skills=["Python", "python", "PYTHON", "React"])
        assert len(data.skills) == 2
