"""
Quick Test Script for Resume Parser
Tests the parser on a single resume without running the full API server
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from pdf_processor import PDFProcessor
from entity_extractor import EntityExtractor
from experience_extractor import ExperienceExtractor
from skills_extractor import SkillsExtractor
from schemas import ResumeData
import json


def test_parse_resume(pdf_path: str):
    """
    Test resume parsing on a single PDF file
    
    Args:
        pdf_path: Path to PDF resume
    """
    print("=" * 60)
    print("RESUME PARSER - Quick Test")
    print("=" * 60)
    
    # Initialize extractors
    print("\n📦 Loading models...")
    pdf_processor = PDFProcessor()
    entity_extractor = EntityExtractor()
    experience_extractor = ExperienceExtractor()
    skills_extractor = SkillsExtractor()
    print("✅ Models loaded successfully\n")
    
    # Extract text
    print(f"📄 Processing: {pdf_path}")
    text = pdf_processor.extract_text(pdf_path)
    
    if not text:
        print("❌ Failed to extract text from PDF")
        return
    
    print(f"✅ Extracted {len(text)} characters\n")
    
    # Extract entities
    print("🔍 Extracting entities...")
    name, email, phone = entity_extractor.extract_all_entities(text)
    print(f"  Name:  {name}")
    print(f"  Email: {email}")
    print(f"  Phone: {phone}\n")
    
    # Extract skills
    print("💡 Extracting skills...")
    skills = skills_extractor.extract_skills(text, use_semantic=True)
    print(f"  Found {len(skills)} skills: {', '.join(skills[:10])}")
    if len(skills) > 10:
        print(f"  ... and {len(skills) - 10} more\n")
    else:
        print()
    
    # Extract experience
    print("💼 Extracting experience...")
    experience = experience_extractor.extract_experiences(text)
    print(f"  Found {len(experience)} experience entries:")
    for i, exp in enumerate(experience, 1):
        print(f"    {i}. {exp.position or 'N/A'} at {exp.company or 'N/A'} ({exp.duration or 'N/A'})")
    print()
    
    # Create ResumeData object
    resume_data = ResumeData(
        name=name,
        email=email,
        phone=phone,
        skills=skills,
        experience=experience
    )
    
    # Print JSON output
    print("=" * 60)
    print("JSON OUTPUT")
    print("=" * 60)
    print(json.dumps(resume_data.model_dump(exclude={"raw_text"}), indent=2))
    print()
    
    print("✅ Test completed successfully!")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_parser.py <path_to_resume.pdf>")
        print("\nExample:")
        print("  python test_parser.py test_data/sample_resume.pdf")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    
    if not Path(pdf_path).exists():
        print(f"Error: File not found: {pdf_path}")
        sys.exit(1)
    
    test_parse_resume(pdf_path)
