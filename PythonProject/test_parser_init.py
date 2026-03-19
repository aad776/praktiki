
import sys
import os
from pathlib import Path

# Add project root to sys path
sys.path.append(os.getcwd())

try:
    from resume_parser.pdf_processor import PDFProcessor
    from resume_parser.entity_extractor import EntityExtractor
    from resume_parser.experience_extractor import ExperienceExtractor
    from resume_parser.skills_extractor import SkillsExtractor
    from resume_parser.config import SPACY_MODEL
    
    print(f"Loading models with {SPACY_MODEL}...")
    pdf_processor = PDFProcessor()
    entity_extractor = EntityExtractor(SPACY_MODEL)
    experience_extractor = ExperienceExtractor()
    skills_extractor = SkillsExtractor()
    print("SUCCESS: Resume parser initialized successfully!")
except Exception as e:
    print(f"FAILURE: Resume parser initialization failed: {e}")
    import traceback
    traceback.print_exc()
