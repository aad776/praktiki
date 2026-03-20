"""
FastAPI Main Application
Production-ready Resume Parsing API  (v2.0)

Pipeline:
  1. PDF -> raw text
  2. Section detection  (Header / Experience / Education / Skills / …)
  3. Segmented processing  (sliding windows for long sections)
  4. Entity extraction  (name, email, phone from Header)
  5. Skills extraction  (exact + fuzzy + semantic, on Skills + full text)
  6. Experience extraction  (relation-based entity grouping)
  7. Education extraction  (relation-based entity grouping)
  8. Confidence scoring & tech-stack detection
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import logging
import time
import os
from typing import Optional

# Load environment variables from .env file (GEMINI_API_KEY, OPENAI_API_KEY, etc.)
try:
    from dotenv import load_dotenv
    load_dotenv()
    logging.info(f"Loaded .env — GEMINI_API_KEY={'set' if os.getenv('GEMINI_API_KEY') else 'NOT set'}")
except ImportError:
    pass  # python-dotenv not installed, rely on system env vars

from schemas import (
    ParseResponse, ResumeData, Education, Experience, Project, Certification,
    SectionInfo, FieldConfidence,
)
from pdf_processor import PDFProcessor
from entity_extractor import EntityExtractor
from experience_extractor import ExperienceExtractor
from skills_extractor import SkillsExtractor
from education_extractor import EducationExtractor
from section_detector import SectionDetector, SectionLabel
from segmented_processor import SegmentedProcessor
from production_monitor import get_monitor
from config import MAX_FILE_SIZE_MB, ALLOWED_EXTENSIONS, SPACY_MODEL

import re as _re

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


app = FastAPI(
    title="Resume Parser API",
    description="Production-grade Resume Parsing API v2.0",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://44.197.97.159",
        "http://ec2-44-197-97-159.compute-1.amazonaws.com",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pdf_processor: Optional[PDFProcessor] = None
entity_extractor: Optional[EntityExtractor] = None
experience_extractor: Optional[ExperienceExtractor] = None
skills_extractor: Optional[SkillsExtractor] = None
education_extractor: Optional[EducationExtractor] = None
section_detector: Optional[SectionDetector] = None
segmented_processor: Optional[SegmentedProcessor] = None
_spacy_nlp = None


@app.on_event("startup")
async def startup_event():
    global pdf_processor, entity_extractor, experience_extractor, skills_extractor, education_extractor, section_detector, segmented_processor, _spacy_nlp

    logger.info("Initializing Resume Parser API v2.0 ...")

    try:
        pdf_processor = PDFProcessor()

        logger.info(f"Loading spaCy model: {SPACY_MODEL} ...")
        entity_extractor = EntityExtractor(SPACY_MODEL)
        _spacy_nlp = entity_extractor.nlp

        experience_extractor = ExperienceExtractor(nlp=_spacy_nlp)
        education_extractor = EducationExtractor(nlp=_spacy_nlp)

        logger.info("Loading skills extractor (FAISS + fuzzy) ...")
        skills_extractor = SkillsExtractor()

        section_detector = SectionDetector()
        segmented_processor = SegmentedProcessor()

        logger.info("All extractors loaded successfully!")
    except Exception as e:
        logger.error(f"Failed to initialize extractors: {e}")
        raise


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
async def root():
    return {"status": "healthy", "message": "Resume Parser API v2.0", "version": "2.0.0"}


@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "extractors": {
            "pdf_processor": pdf_processor is not None,
            "entity_extractor": entity_extractor is not None,
            "experience_extractor": experience_extractor is not None,
            "skills_extractor": skills_extractor is not None,
            "education_extractor": education_extractor is not None,
            "section_detector": section_detector is not None,
        },
    }


# ---------------------------------------------------------------------------
# Helper extractors for Projects and Certifications
# ---------------------------------------------------------------------------

# Pattern: "ProjectTitle | Tech1, Tech2, Tech3" or "ProjectTitle (Tech1, Tech2)"
_PROJECT_TITLE_PATTERN = _re.compile(
    r'^([A-Z][^\n|•·–—]{2,60})\s*(?:\||\u2013|\u2014)\s*(.+?)(?:\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*)?$',
    _re.IGNORECASE,
)

# Date pattern at end of line like "Sep 2025" or "Aug 2025"
_DATE_AT_END = _re.compile(
    r'(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|'
    r'Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+'
    r'(?:19|20)\d{2}',
    _re.IGNORECASE,
)


def _extract_projects(text: str) -> list:
    """Extract project entries from the Projects section text."""
    projects = []
    lines = text.strip().split('\n')
    current_project = None

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Check if line is a project title (contains pipe-separated tech or looks like a title)
        title_match = _PROJECT_TITLE_PATTERN.match(stripped)

        # Also detect lines that look like titles: short, not starting with bullet, title-cased
        is_bullet = stripped.startswith(('•', '–', '-', '·', '◦', '▪'))
        is_title_line = (
            not is_bullet
            and len(stripped) < 120
            and not stripped.startswith(('Designed', 'Developed', 'Built', 'Created',
                                         'Implemented', 'Integrated', 'Engineered',
                                         'Programmed', 'Architected', 'Constructed',
                                         'Coordinated', 'Instructed', 'Transformed',
                                         'Orchestrated'))
        )

        if title_match:
            # Save previous project
            if current_project:
                projects.append(current_project)

            title = title_match.group(1).strip()
            tech_str = title_match.group(2).strip()
            # Extract date from the tech string if present
            date_match = _DATE_AT_END.search(stripped)
            if date_match:
                tech_str = stripped[title_match.end(1):date_match.start()].strip(' |–—\t')

            techs = [t.strip() for t in _re.split(r'[,|]', tech_str) if t.strip()]
            current_project = Project(title=title, technologies=techs, description="")

        elif is_title_line and not current_project and len(stripped.split()) <= 10:
            # Could be a standalone project title without tech stack
            if current_project:
                projects.append(current_project)
            current_project = Project(title=stripped, technologies=[], description="")

        elif is_bullet and current_project:
            # Bullet point = description for current project
            bullet_text = stripped.lstrip('•–-·◦▪ ').strip()
            if current_project.description:
                current_project.description += " " + bullet_text
            else:
                current_project.description = bullet_text

        elif current_project and not is_title_line:
            # Continuation text
            if current_project.description:
                current_project.description += " " + stripped
            else:
                current_project.description = stripped

    # Don't forget the last project
    if current_project:
        projects.append(current_project)

    # Cap descriptions
    for p in projects:
        if p.description and len(p.description) > 500:
            p.description = p.description[:500]

    return projects


def _extract_certifications(text: str) -> list:
    """Extract certification/accomplishment entries from section text."""
    certifications = []
    lines = text.strip().split('\n')
    current_cert = None

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        is_bullet = stripped.startswith(('•', '–', '-', '·', '◦', '▪'))

        if not is_bullet and len(stripped) < 120:
            # Could be a cert/award title line
            date_match = _DATE_AT_END.search(stripped)
            # Check for year range pattern
            year_match = _re.search(
                r'(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+)?'
                r'(?:19|20)\d{2}\s*[-–—]\s*'
                r'(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+)?'
                r'(?:(?:19|20)\d{2}|Present|Current)',
                stripped, _re.IGNORECASE
            )

            if date_match or year_match:
                if current_cert:
                    certifications.append(current_cert)
                date_str = (year_match.group(0) if year_match else
                            date_match.group(0) if date_match else "")
                name = stripped
                if date_str:
                    name = stripped.replace(date_str, '').strip(' –—-\t')
                current_cert = Certification(name=name, date=date_str, issuer=None)
            elif current_cert and not current_cert.issuer:
                # The line after a cert title is often the issuer/role
                current_cert.issuer = stripped
            else:
                if current_cert:
                    certifications.append(current_cert)
                current_cert = Certification(name=stripped, issuer=None, date=None)

        elif is_bullet and current_cert:
            # Bullets are descriptions, we can use them as issuer context
            pass

    if current_cert:
        certifications.append(current_cert)

    return certifications

@app.post("/parse", response_model=ParseResponse, tags=["Resume Parsing"])
async def parse_resume(file: UploadFile = File(...)):
    """
    Hybrid resume parser: tries LLM-based extraction first (handles ANY format),
    falls back to traditional NLP pipeline if LLM is not configured or fails.
    """
    start_time = time.time()

    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")

        file_ext = file.filename.split(".")[-1].lower()
        if f".{file_ext}" not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
            )

        file_content = await file.read()
        file_size_mb = len(file_content) / (1024 * 1024)
        if file_size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=400,
                detail=f"File too large ({file_size_mb:.1f}MB > {MAX_FILE_SIZE_MB}MB)",
            )

        logger.info(f"Processing: {file.filename} ({file_size_mb:.2f} MB)")

        # 1. PDF -> text (always needed)
        text = pdf_processor.extract_text_from_bytes(file_content)
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")

        # 2. Try LLM-based parsing first (industry-grade, handles any format)
        llm_result = None
        try:
            from llm_parser import llm_parse_resume, normalize_llm_output, LLMParserError
            llm_raw = await llm_parse_resume(text, provider="auto")
            llm_result = normalize_llm_output(llm_raw)
            logger.info("LLM-based parsing succeeded")
        except Exception as llm_err:
            logger.info(f"LLM parsing not available or failed: {llm_err}. Using traditional pipeline.")

        if llm_result:
            # Build ResumeData from LLM output
            resume_data = ResumeData(
                name=llm_result.get("name"),
                email=llm_result.get("email"),
                phone=llm_result.get("phone"),
                summary=llm_result.get("summary"),
                linkedin=llm_result.get("linkedin"),
                github=llm_result.get("github"),
                skills=llm_result.get("skills", []),
                skills_categorized=llm_result.get("skills_categorized"),
                experience=[Experience(**{k: v for k, v in e.items() if k in Experience.__fields__}) for e in llm_result.get("experience", [])],
                education=[Education(**{k: v for k, v in e.items() if k in Education.__fields__}) for e in llm_result.get("education", [])],
                projects=[Project(**{k: v for k, v in p.items() if k in Project.__fields__}) for p in llm_result.get("projects", [])],
                certifications=[Certification(**{k: v for k, v in c.items() if k in Certification.__fields__}) for c in llm_result.get("certifications", [])],
                total_experience_years=llm_result.get("total_experience_years"),
                detected_sections=[],
                confidence=FieldConfidence(
                    name=1.0 if llm_result.get("name") else 0.0,
                    email=1.0 if llm_result.get("email") else 0.0,
                    phone=1.0 if llm_result.get("phone") else 0.0,
                    skills=min(len(llm_result.get("skills", [])) / 5, 1.0),
                    experience=min(len(llm_result.get("experience", [])) / 2, 1.0),
                    education=min(len(llm_result.get("education", [])), 1.0),
                ),
                detected_stacks=llm_result.get("detected_stacks", []),
                raw_text=text[:500],
            )
        else:
            # 3. Fallback: Traditional NLP pipeline
            resume_data = _traditional_parse(text)

        processing_time_ms = (time.time() - start_time) * 1000

        monitor = get_monitor()
        monitor.log_parse_result(
            filename=file.filename,
            resume_data=resume_data,
            processing_time_ms=processing_time_ms,
            success=True,
            error=None,
        )

        logger.info(f"Parsed resume in {processing_time_ms:.0f}ms")
        return ParseResponse(
            success=True,
            data=resume_data,
            error=None,
            processing_time_ms=processing_time_ms,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error parsing resume: {e}", exc_info=True)
        processing_time_ms = (time.time() - start_time) * 1000
        monitor = get_monitor()
        monitor.log_parse_result(
            filename=file.filename if file and file.filename else "unknown",
            resume_data=None,
            processing_time_ms=processing_time_ms,
            success=False,
            error=str(e),
        )
        return ParseResponse(
            success=False, data=None, error=str(e),
            processing_time_ms=processing_time_ms,
        )


@app.post("/parse/llm", response_model=ParseResponse, tags=["Resume Parsing"])
async def parse_resume_llm(file: UploadFile = File(...)):
    """Force LLM-based parsing (requires OPENAI_API_KEY or GEMINI_API_KEY)."""
    start_time = time.time()
    try:
        file_content = await file.read()
        text = pdf_processor.extract_text_from_bytes(file_content)
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")

        from llm_parser import llm_parse_resume, normalize_llm_output
        llm_raw = await llm_parse_resume(text, provider="auto")
        llm_result = normalize_llm_output(llm_raw)

        resume_data = ResumeData(
            name=llm_result.get("name"),
            email=llm_result.get("email"),
            phone=llm_result.get("phone"),
            summary=llm_result.get("summary"),
            linkedin=llm_result.get("linkedin"),
            github=llm_result.get("github"),
            skills=llm_result.get("skills", []),
            skills_categorized=llm_result.get("skills_categorized"),
            experience=[Experience(**{k: v for k, v in e.items() if k in Experience.__fields__}) for e in llm_result.get("experience", [])],
            education=[Education(**{k: v for k, v in e.items() if k in Education.__fields__}) for e in llm_result.get("education", [])],
            projects=[Project(**{k: v for k, v in p.items() if k in Project.__fields__}) for p in llm_result.get("projects", [])],
            certifications=[Certification(**{k: v for k, v in c.items() if k in Certification.__fields__}) for c in llm_result.get("certifications", [])],
            total_experience_years=llm_result.get("total_experience_years"),
            detected_sections=[],
            confidence=FieldConfidence(
                name=1.0 if llm_result.get("name") else 0.0,
                email=1.0 if llm_result.get("email") else 0.0,
                phone=1.0 if llm_result.get("phone") else 0.0,
                skills=min(len(llm_result.get("skills", [])) / 5, 1.0),
                experience=min(len(llm_result.get("experience", [])) / 2, 1.0),
                education=min(len(llm_result.get("education", [])), 1.0),
            ),
            detected_stacks=[],
            raw_text=text[:500],
        )

        processing_time_ms = (time.time() - start_time) * 1000
        return ParseResponse(success=True, data=resume_data, processing_time_ms=processing_time_ms)

    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        return ParseResponse(success=False, data=None, error=str(e), processing_time_ms=processing_time_ms)


@app.post("/parse/traditional", response_model=ParseResponse, tags=["Resume Parsing"])
async def parse_resume_traditional(file: UploadFile = File(...)):
    """Force traditional NLP pipeline (no LLM, uses spaCy + regex)."""
    start_time = time.time()
    try:
        file_content = await file.read()
        text = pdf_processor.extract_text_from_bytes(file_content)
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")

        resume_data = _traditional_parse(text)
        processing_time_ms = (time.time() - start_time) * 1000
        return ParseResponse(success=True, data=resume_data, processing_time_ms=processing_time_ms)

    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        return ParseResponse(success=False, data=None, error=str(e), processing_time_ms=processing_time_ms)


def _traditional_parse(text: str) -> ResumeData:
    """The original NLP pipeline: section detection → entity extraction → etc."""
    sections = section_detector.detect(text)
    section_infos = [
        SectionInfo(label=s.label.value, start_line=s.start_line, end_line=s.end_line, confidence=s.confidence)
        for s in sections
    ]

    header_sec = section_detector.get_section(sections, SectionLabel.HEADER)
    header_text = header_sec.text if header_sec else text[:1500]
    name, email, phone = entity_extractor.extract_all_entities(header_text)
    if not name:
        name, _, _ = entity_extractor.extract_all_entities(text[:1500])

    skills_sec = section_detector.get_section(sections, SectionLabel.SKILLS)
    skills_text = skills_sec.text if skills_sec else ""
    windows = segmented_processor.create_windows_from_sections(sections)
    all_skill_lists = []
    if skills_text:
        all_skill_lists.append(skills_extractor.extract_skills(skills_text, use_semantic=True, use_fuzzy=True))
    for w in windows:
        all_skill_lists.append(skills_extractor.extract_skills(w.text, use_semantic=True, use_fuzzy=True))
    skills = SegmentedProcessor.merge_skill_lists(*all_skill_lists)
    skills_categorized = skills_extractor.get_skill_categories(skills)

    from app.skills.skill_graph import get_skill_graph
    detected_stacks = get_skill_graph().detect_stacks(set(skills))

    exp_sec = section_detector.get_section(sections, SectionLabel.EXPERIENCE)
    exp_text = exp_sec.text if exp_sec else text
    experience = experience_extractor.extract_experiences(exp_text)
    total_years = ExperienceExtractor.extract_total_years_experience(experience)

    edu_sec = section_detector.get_section(sections, SectionLabel.EDUCATION)
    edu_text = edu_sec.text if edu_sec else text
    edu_entries = education_extractor.extract(edu_text)
    education = [Education(**e.to_dict()) for e in edu_entries]

    projects = []
    proj_sec = section_detector.get_section(sections, SectionLabel.PROJECTS)
    if proj_sec and proj_sec.text.strip():
        projects = _extract_projects(proj_sec.text)

    certifications = []
    cert_sec = section_detector.get_section(sections, SectionLabel.CERTIFICATIONS)
    awards_sec = section_detector.get_section(sections, SectionLabel.AWARDS)
    cert_text = ""
    if cert_sec and cert_sec.text.strip():
        cert_text += cert_sec.text + "\n"
    if awards_sec and awards_sec.text.strip():
        cert_text += awards_sec.text
    if cert_text.strip():
        certifications = _extract_certifications(cert_text)

    confidence = FieldConfidence(
        name=1.0 if name else 0.0,
        email=1.0 if email else 0.0,
        phone=1.0 if phone else 0.0,
        skills=min(len(skills) / 5, 1.0) if skills else 0.0,
        experience=min(len(experience) / 2, 1.0) if experience else 0.0,
        education=min(len(education), 1.0) if education else 0.0,
    )

    return ResumeData(
        name=name, email=email, phone=phone,
        skills=skills, skills_categorized=skills_categorized,
        experience=experience, education=education,
        projects=projects, certifications=certifications,
        total_experience_years=total_years,
        detected_sections=section_infos, confidence=confidence,
        detected_stacks=detected_stacks, raw_text=text[:500],
    )


@app.post("/parse-batch", tags=["Resume Parsing"])
async def parse_batch(files: list[UploadFile] = File(...)):
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files per batch")
    results = []
    for f in files:
        try:
            results.append(await parse_resume(f))
        except Exception as e:
            results.append(ParseResponse(success=False, data=None, error=str(e)))
    return results


# ---------------------------------------------------------------------------
# Monitoring
# ---------------------------------------------------------------------------

@app.get("/metrics", tags=["Monitoring"])
async def get_metrics():
    return get_monitor().get_current_metrics()


@app.post("/feedback", tags=["Monitoring"])
async def submit_feedback(
    filename: str = Body(...),
    field: str = Body(...),
    predicted_value: str = Body(...),
    correct_value: str = Body(...),
    is_correct: bool = Body(...),
):
    get_monitor().log_human_feedback(
        filename=filename,
        field=field,
        predicted_value=predicted_value,
        correct_value=correct_value,
        is_correct=is_correct,
    )
    return {"message": "Feedback recorded", "filename": filename, "field": field}


@app.get("/accuracy", tags=["Monitoring"])
async def get_accuracy_from_feedback():
    return get_monitor().calculate_accuracy_from_feedback()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True, log_level="info")
