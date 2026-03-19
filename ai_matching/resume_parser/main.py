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
from typing import Optional

from schemas import (
    ParseResponse, ResumeData, Education, SectionInfo, FieldConfidence,
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
# Core parse endpoint
# ---------------------------------------------------------------------------

@app.post("/parse", response_model=ParseResponse, tags=["Resume Parsing"])
async def parse_resume(file: UploadFile = File(...)):
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

        # 1. PDF -> text
        text = pdf_processor.extract_text_from_bytes(file_content)
        if not text:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF")

        # 2. Section detection
        sections = section_detector.detect(text)
        section_infos = [
            SectionInfo(
                label=s.label.value,
                start_line=s.start_line,
                end_line=s.end_line,
                confidence=s.confidence,
            )
            for s in sections
        ]

        # 3. Entity extraction (from header or first 1500 chars)
        header_sec = section_detector.get_section(sections, SectionLabel.HEADER)
        header_text = header_sec.text if header_sec else text[:1500]
        name, email, phone = entity_extractor.extract_all_entities(header_text)
        if not name:
            name, _, _ = entity_extractor.extract_all_entities(text[:1500])

        # 4. Skills extraction -- run on Skills section + full text windows
        skills_sec = section_detector.get_section(sections, SectionLabel.SKILLS)
        skills_text = skills_sec.text if skills_sec else ""

        windows = segmented_processor.create_windows_from_sections(sections)
        all_skill_lists = []
        if skills_text:
            all_skill_lists.append(
                skills_extractor.extract_skills(skills_text, use_semantic=True, use_fuzzy=True)
            )
        for w in windows:
            all_skill_lists.append(
                skills_extractor.extract_skills(w.text, use_semantic=True, use_fuzzy=True)
            )
        skills = SegmentedProcessor.merge_skill_lists(*all_skill_lists)

        skills_categorized = skills_extractor.get_skill_categories(skills)

        from app.skills.skill_graph import get_skill_graph
        detected_stacks = get_skill_graph().detect_stacks(set(skills))

        # 5. Experience extraction (from Experience section or full text)
        exp_sec = section_detector.get_section(sections, SectionLabel.EXPERIENCE)
        exp_text = exp_sec.text if exp_sec else text
        experience = experience_extractor.extract_experiences(exp_text)
        total_years = ExperienceExtractor.extract_total_years_experience(experience)

        # 6. Education extraction (from Education section or full text)
        edu_sec = section_detector.get_section(sections, SectionLabel.EDUCATION)
        edu_text = edu_sec.text if edu_sec else text
        edu_entries = education_extractor.extract(edu_text)
        education = [
            Education(**e.to_dict()) for e in edu_entries
        ]

        # 7. Confidence
        confidence = FieldConfidence(
            name=1.0 if name else 0.0,
            email=1.0 if email else 0.0,
            phone=1.0 if phone else 0.0,
            skills=min(len(skills) / 5, 1.0) if skills else 0.0,
            experience=min(len(experience) / 2, 1.0) if experience else 0.0,
            education=min(len(education), 1.0) if education else 0.0,
        )

        resume_data = ResumeData(
            name=name,
            email=email,
            phone=phone,
            skills=skills,
            skills_categorized=skills_categorized,
            experience=experience,
            education=education,
            total_experience_years=total_years,
            detected_sections=section_infos,
            confidence=confidence,
            detected_stacks=detected_stacks,
            raw_text=text[:500],
        )

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
