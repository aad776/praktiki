"""
FastAPI Main Application
Production-ready Resume Parsing API
"""
from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import time
from typing import Optional

from schemas import ParseResponse, ResumeData
from pdf_processor import PDFProcessor
from entity_extractor import EntityExtractor
from experience_extractor import ExperienceExtractor
from skills_extractor import SkillsExtractor
from production_monitor import get_monitor
from config import MAX_FILE_SIZE_MB, ALLOWED_EXTENSIONS, SPACY_MODEL

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Resume Parser API",
    description="Production-grade Resume Parsing API with >90% field-level accuracy",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://44.197.97.159",

        "http://ec2-44-197-97-159.compute-1.amazonaws.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_origins=["*"],
    allow_headers=["*"],
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global extractors (initialized on startup)
pdf_processor: Optional[PDFProcessor] = None
entity_extractor: Optional[EntityExtractor] = None
experience_extractor: Optional[ExperienceExtractor] = None
skills_extractor: Optional[SkillsExtractor] = None


@app.on_event("startup")
async def startup_event():
    """Initialize all extractors on startup"""
    global pdf_processor, entity_extractor, experience_extractor, skills_extractor
    
    logger.info("Initializing Resume Parser API...")
    
    try:
        # Initialize processors
        logger.info("Loading PDF processor...")
        pdf_processor = PDFProcessor()
        
        logger.info(f"Loading entity extractor with model: {SPACY_MODEL}...")
        entity_extractor = EntityExtractor(SPACY_MODEL)
        
        logger.info("Loading experience extractor...")
        experience_extractor = ExperienceExtractor()
        
        logger.info("Loading skills extractor with FAISS...")
        skills_extractor = SkillsExtractor()
        
        logger.info("✅ All extractors loaded successfully!")
    
    except Exception as e:
        logger.error(f"❌ Failed to initialize extractors: {e}")
        raise


@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Resume Parser API is running",
        "version": "1.0.0"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "extractors": {
            "pdf_processor": pdf_processor is not None,
            "entity_extractor": entity_extractor is not None,
            "experience_extractor": experience_extractor is not None,
            "skills_extractor": skills_extractor is not None
        }
    }


@app.post("/parse", response_model=ParseResponse, tags=["Resume Parsing"])
async def parse_resume(file: UploadFile = File(...)):
    """
    Parse resume PDF and extract structured data
    
    Args:
        file: PDF file upload
        
    Returns:
        ParseResponse with extracted resume data
        
    Raises:
        HTTPException: If parsing fails
    """
    start_time = time.time()
    
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Check file extension
        file_ext = file.filename.split('.')[-1].lower()
        if f".{file_ext}" not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Read file content
        file_content = await file.read()
        file_size_mb = len(file_content) / (1024 * 1024)
        
        # Check file size
        if file_size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=400,
                detail=f"File size ({file_size_mb:.2f}MB) exceeds maximum ({MAX_FILE_SIZE_MB}MB)"
            )
        
        logger.info(f"Processing file: {file.filename} ({file_size_mb:.2f}MB)")
        
        # Step 1: Extract text from PDF
        text = pdf_processor.extract_text_from_bytes(file_content)
        
        if not text:
            raise HTTPException(status_code=400, detail="Failed to extract text from PDF")
        
        logger.info(f"Extracted {len(text)} characters from PDF")
        
        # Step 2: Extract entities (name, email, phone)
        name, email, phone = entity_extractor.extract_all_entities(text)
        
        # Step 3: Extract skills
        skills = skills_extractor.extract_skills(text, use_semantic=True)
        
        # Step 4: Extract experience
        experience = experience_extractor.extract_experiences(text)
        
        # Create ResumeData object
        resume_data = ResumeData(
            name=name,
            email=email,
            phone=phone,
            skills=skills,
            experience=experience,
            raw_text=text[:500]  # Include first 500 chars as preview
        )
        
        # Calculate processing time
        processing_time_ms = (time.time() - start_time) * 1000
        
        # Log to production monitor
        monitor = get_monitor()
        monitor.log_parse_result(
            filename=file.filename,
            resume_data=resume_data,
            processing_time_ms=processing_time_ms,
            success=True,
            error=None
        )
        
        logger.info(f"✅ Successfully parsed resume in {processing_time_ms:.2f}ms")
        
        return ParseResponse(
            success=True,
            data=resume_data,
            error=None,
            processing_time_ms=processing_time_ms
        )
    
    except HTTPException:
        raise
    
    except Exception as e:
        logger.error(f"❌ Error parsing resume: {e}", exc_info=True)
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        # Log error to production monitor
        monitor = get_monitor()
        monitor.log_parse_result(
            filename=file.filename if file and file.filename else "unknown",
            resume_data=None,
            processing_time_ms=processing_time_ms,
            success=False,
            error=str(e)
        )
        
        return ParseResponse(
            success=False,
            data=None,
            error=str(e),
            processing_time_ms=processing_time_ms
        )


@app.post("/parse-batch", tags=["Resume Parsing"])
async def parse_batch(files: list[UploadFile] = File(...)):
    """
    Parse multiple resumes in batch
    
    Args:
        files: List of PDF files
        
    Returns:
        List of ParseResponse objects
    """
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 files allowed per batch")
    
    results = []
    
    for file in files:
        try:
            result = await parse_resume(file)
            results.append(result)
        except Exception as e:
            logger.error(f"Error processing {file.filename}: {e}")
            results.append(ParseResponse(
                success=False,
                data=None,
                error=str(e)
            ))
    
    return results


@app.get("/metrics", tags=["Monitoring"])
async def get_metrics():
    """
    Get current production metrics
    
    Returns:
        Current session metrics including:
        - Total requests
        - Success/failure rates
        - Processing time stats
        - Field extraction rates
        - Confidence scores
    """
    monitor = get_monitor()
    return monitor.get_current_metrics()


@app.post("/feedback", tags=["Monitoring"])
async def submit_feedback(
    filename: str = Body(...),
    field: str = Body(...),
    predicted_value: str = Body(...),
    correct_value: str = Body(...),
    is_correct: bool = Body(...)
):
    """
    Submit human feedback for accuracy tracking
    
    Args:
        filename: Resume filename
        field: Field name (name, email, phone, skills, experience)
        predicted_value: What the model predicted
        correct_value: Correct value from human review
        is_correct: Whether prediction was correct
        
    Returns:
        Confirmation message
    """
    monitor = get_monitor()
    monitor.log_human_feedback(
        filename=filename,
        field=field,
        predicted_value=predicted_value,
        correct_value=correct_value,
        is_correct=is_correct
    )
    
    return {
        "message": "Feedback recorded successfully",
        "filename": filename,
        "field": field
    }


@app.get("/accuracy", tags=["Monitoring"])
async def get_accuracy_from_feedback():
    """
    Get accuracy metrics calculated from human feedback
    
    Returns:
        Per-field accuracy metrics based on human feedback
    """
    monitor = get_monitor()
    return monitor.calculate_accuracy_from_feedback()


if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting Resume Parser API server...")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,  # Different port from main praktiki app
        reload=True,
        log_level="info"
    )
