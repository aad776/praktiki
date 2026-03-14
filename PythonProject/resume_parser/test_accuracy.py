import sys
import io
# Fix Windows console encoding
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

"""
Accuracy Test Script for Resume Parser
Tests the parser against all 120 IT resumes in INFORMATION-TECHNOLOGY directory.

Since there are no ground truth files, this script:
1. Parses all resumes and measures extraction coverage
2. Runs heuristic quality checks (email format, phone format, etc.)
3. Generates a detailed report with per-resume results
4. Creates a sample ground truth template for manual review
5. Outputs results to JSON + formatted console report

Usage:
    python test_accuracy.py
    python test_accuracy.py --sample 10      # Quick test with 10 resumes
    python test_accuracy.py --verbose        # Show per-resume details
"""
import json
import logging
import re
import sys
import time
import os
from pathlib import Path
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field, asdict

# Add parent directory to path so we can import local modules
sys.path.insert(0, str(Path(__file__).parent))

from pdf_processor import PDFProcessor
from entity_extractor import EntityExtractor
from experience_extractor import ExperienceExtractor
from skills_extractor import SkillsExtractor
from config import SPACY_MODEL

# Configure logging - reduce noise from libraries
logging.basicConfig(
    level=logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
# Keep our logger at INFO
logger = logging.getLogger("test_accuracy")
logger.setLevel(logging.INFO)

# Suppress noisy loggers
for noisy in ["pdfminer", "pdfplumber", "sentence_transformers", "urllib3", "filelock"]:
    logging.getLogger(noisy).setLevel(logging.ERROR)


# ─── Data Classes ───────────────────────────────────────────────────────────

@dataclass
class QualityCheck:
    """Result of a heuristic quality check on an extracted field"""
    field: str
    extracted: bool
    valid_format: bool
    value: Optional[str] = None
    issue: Optional[str] = None


@dataclass
class ResumeResult:
    """Full result for a single resume"""
    filename: str
    success: bool
    processing_time_ms: float = 0.0
    text_extracted: bool = False
    text_length: int = 0
    
    # Extracted values
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    skills: List[str] = field(default_factory=list)
    experience_count: int = 0
    experience_details: List[Dict] = field(default_factory=list)
    
    # Quality checks
    quality_checks: List[Dict] = field(default_factory=list)
    quality_score: float = 0.0  # 0.0 to 1.0
    
    error: Optional[str] = None


@dataclass
class AggregateMetrics:
    """Aggregated metrics across all resumes"""
    total_resumes: int = 0
    successful_parses: int = 0
    failed_parses: int = 0
    
    # Extraction coverage (% of resumes where field was extracted)
    name_extracted_pct: float = 0.0
    email_extracted_pct: float = 0.0
    phone_extracted_pct: float = 0.0
    skills_extracted_pct: float = 0.0
    experience_extracted_pct: float = 0.0
    
    # Quality metrics (% of extracted fields passing quality checks)
    name_valid_pct: float = 0.0
    email_valid_pct: float = 0.0
    phone_valid_pct: float = 0.0
    
    # Stats
    avg_skills_count: float = 0.0
    avg_experience_count: float = 0.0
    avg_processing_time_ms: float = 0.0
    avg_quality_score: float = 0.0
    
    # Overall estimated accuracy
    overall_extraction_rate: float = 0.0
    overall_quality_rate: float = 0.0


# ─── Quality Validators ────────────────────────────────────────────────────

def validate_name(name: Optional[str]) -> QualityCheck:
    """Check if extracted name looks valid"""
    if not name:
        return QualityCheck(field="name", extracted=False, valid_format=False, issue="Not extracted")
    
    # Name should be 2+ words, only letters/spaces/hyphens, reasonable length
    name = name.strip()
    issues = []
    
    if len(name) < 3:
        issues.append("Too short")
    if len(name) > 60:
        issues.append("Too long")
    if re.search(r'\d', name):
        issues.append("Contains digits")
    if '@' in name:
        issues.append("Contains @ (likely email)")
    if len(name.split()) < 2:
        issues.append("Single word (expected first + last)")
    
    # Check for common garbage
    garbage_patterns = [r'resume', r'curriculum', r'vitae', r'page \d', r'http', r'www\.']
    for pattern in garbage_patterns:
        if re.search(pattern, name, re.IGNORECASE):
            issues.append(f"Contains garbage: {pattern}")
    
    valid = len(issues) == 0
    return QualityCheck(
        field="name", 
        extracted=True, 
        valid_format=valid, 
        value=name,
        issue="; ".join(issues) if issues else None
    )


def validate_email(email: Optional[str]) -> QualityCheck:
    """Check if extracted email looks valid"""
    if not email:
        return QualityCheck(field="email", extracted=False, valid_format=False, issue="Not extracted")
    
    email = email.strip()
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    valid = bool(re.match(email_pattern, email))
    
    return QualityCheck(
        field="email",
        extracted=True,
        valid_format=valid,
        value=email,
        issue=None if valid else "Invalid email format"
    )


def validate_phone(phone: Optional[str]) -> QualityCheck:
    """Check if extracted phone looks valid"""
    if not phone:
        return QualityCheck(field="phone", extracted=False, valid_format=False, issue="Not extracted")
    
    phone = phone.strip()
    # Strip all non-digits to check we have enough numbers
    digits = re.sub(r'\D', '', phone)
    
    issues = []
    if len(digits) < 7:
        issues.append(f"Too few digits ({len(digits)})")
    if len(digits) > 15:
        issues.append(f"Too many digits ({len(digits)})")
    
    valid = len(issues) == 0
    return QualityCheck(
        field="phone",
        extracted=True,
        valid_format=valid,
        value=phone,
        issue="; ".join(issues) if issues else None
    )


def validate_skills(skills: List[str]) -> QualityCheck:
    """Check if extracted skills look reasonable"""
    extracted = len(skills) > 0
    
    issues = []
    if len(skills) == 0:
        issues.append("No skills extracted")
    elif len(skills) < 3:
        issues.append(f"Very few skills ({len(skills)})")
    
    valid = extracted and len(skills) >= 3
    return QualityCheck(
        field="skills",
        extracted=extracted,
        valid_format=valid,
        value=f"{len(skills)} skills: {', '.join(skills[:10])}{'...' if len(skills) > 10 else ''}",
        issue="; ".join(issues) if issues else None
    )


def validate_experience(experiences: List) -> QualityCheck:
    """Check if extracted experiences look reasonable"""
    extracted = len(experiences) > 0
    
    issues = []
    if len(experiences) == 0:
        issues.append("No experience extracted")
    
    valid = extracted
    return QualityCheck(
        field="experience",
        extracted=extracted,
        valid_format=valid,
        value=f"{len(experiences)} entries",
        issue="; ".join(issues) if issues else None
    )


# ─── Main Test Runner ──────────────────────────────────────────────────────

class AccuracyTester:
    """Runs accuracy tests on a directory of resume PDFs"""
    
    def __init__(self):
        logger.info("Initializing extractors...")
        self.pdf_processor = PDFProcessor()
        self.entity_extractor = EntityExtractor(SPACY_MODEL)
        self.experience_extractor = ExperienceExtractor()
        self.skills_extractor = SkillsExtractor()
        logger.info("All extractors initialized ✅")
    
    def parse_single_resume(self, pdf_path: Path) -> ResumeResult:
        """Parse a single resume and run quality checks"""
        result = ResumeResult(filename=pdf_path.name, success=False)
        
        start_time = time.time()
        
        try:
            # Step 1: Extract text
            text = self.pdf_processor.extract_text(str(pdf_path))
            
            if not text:
                result.error = "Failed to extract text from PDF"
                result.processing_time_ms = (time.time() - start_time) * 1000
                return result
            
            result.text_extracted = True
            result.text_length = len(text)
            
            # Step 2: Extract entities
            name, email, phone = self.entity_extractor.extract_all_entities(text)
            result.name = name
            result.email = email
            result.phone = phone
            
            # Step 3: Extract skills
            skills = self.skills_extractor.extract_skills(text, use_semantic=True)
            result.skills = skills
            
            # Step 4: Extract experience
            experiences = self.experience_extractor.extract_experiences(text)
            result.experience_count = len(experiences)
            result.experience_details = [
                {
                    "company": getattr(exp, 'company', None) if hasattr(exp, 'company') else exp.get('company'),
                    "position": getattr(exp, 'position', None) if hasattr(exp, 'position') else exp.get('position'),
                    "duration": getattr(exp, 'duration', None) if hasattr(exp, 'duration') else exp.get('duration'),
                }
                for exp in experiences
            ]
            
            # Step 5: Run quality checks
            checks = [
                validate_name(name),
                validate_email(email),
                validate_phone(phone),
                validate_skills(skills),
                validate_experience(experiences),
            ]
            
            result.quality_checks = [asdict(c) for c in checks]
            
            # Calculate quality score (weighted)
            weights = {"name": 0.20, "email": 0.20, "phone": 0.15, "skills": 0.25, "experience": 0.20}
            total_score = 0.0
            for check in checks:
                weight = weights.get(check.field, 0.0)
                if check.extracted and check.valid_format:
                    total_score += weight * 1.0
                elif check.extracted:
                    total_score += weight * 0.5  # Extracted but bad format
                # else: 0
            
            result.quality_score = total_score
            result.success = True
            
        except Exception as e:
            result.error = str(e)
            logger.error(f"Error parsing {pdf_path.name}: {e}")
        
        result.processing_time_ms = (time.time() - start_time) * 1000
        return result
    
    def run_test(self, test_dir: str, sample_size: Optional[int] = None, verbose: bool = False) -> Dict:
        """
        Run accuracy testing on all PDFs in directory.
        
        Args:
            test_dir: Directory containing resume PDFs
            sample_size: If set, only test this many resumes
            verbose: Print per-resume details
            
        Returns:
            Dictionary with full results
        """
        test_path = Path(test_dir)
        
        if not test_path.exists():
            logger.error(f"Directory not found: {test_dir}")
            return {}
        
        # Find all PDFs
        pdf_files = sorted(test_path.glob("*.pdf"))
        
        if not pdf_files:
            logger.error("No PDF files found")
            return {}
        
        if sample_size:
            pdf_files = pdf_files[:sample_size]
        
        total = len(pdf_files)
        logger.info(f"Testing {total} resumes from {test_dir}")
        
        print(f"\n{'='*70}")
        print(f"  RESUME PARSER ACCURACY TEST")
        print(f"  Testing {total} resumes from: {test_path.name}/")
        print(f"{'='*70}\n")
        
        results: List[ResumeResult] = []
        
        for i, pdf_file in enumerate(pdf_files, 1):
            # Progress indicator
            pct = (i / total) * 100
            bar_len = 30
            filled = int(bar_len * i / total)
            bar = '#' * filled + '-' * (bar_len - filled)
            print(f"\r  [{bar}] {pct:5.1f}% ({i}/{total}) - {pdf_file.name}", end='', flush=True)
            
            result = self.parse_single_resume(pdf_file)
            results.append(result)
            
            if verbose and result.success:
                print(f"\n    Name:  {result.name or '?'}")
                print(f"    Email: {result.email or '?'}")
                print(f"    Phone: {result.phone or '?'}")
                print(f"    Skills ({len(result.skills)}): {', '.join(result.skills[:8])}{'...' if len(result.skills) > 8 else ''}")
                print(f"    Experience: {result.experience_count} entries")
                print(f"    Quality: {result.quality_score:.0%}")
                for check in result.quality_checks:
                    status = '✅' if check['valid_format'] else ('⚠️' if check['extracted'] else '❌')
                    issue = f" ({check['issue']})" if check.get('issue') else ""
                    print(f"      {status} {check['field']}{issue}")
                print()
        
        print("\n")  # End progress bar
        
        # Compute aggregate metrics
        metrics = self._compute_aggregates(results)
        
        # Print report
        self._print_report(metrics, results)
        
        # Generate ground truth template for manual review (first 5)
        self._generate_ground_truth_template(results[:5], test_path)
        
        return {
            "metrics": asdict(metrics),
            "results": [asdict(r) for r in results],
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
    
    def _compute_aggregates(self, results: List[ResumeResult]) -> AggregateMetrics:
        """Compute aggregate accuracy metrics"""
        m = AggregateMetrics()
        
        m.total_resumes = len(results)
        m.successful_parses = sum(1 for r in results if r.success)
        m.failed_parses = m.total_resumes - m.successful_parses
        
        successful = [r for r in results if r.success]
        n = len(successful) or 1  # avoid division by zero
        
        # Extraction coverage
        m.name_extracted_pct = sum(1 for r in successful if r.name) / n
        m.email_extracted_pct = sum(1 for r in successful if r.email) / n
        m.phone_extracted_pct = sum(1 for r in successful if r.phone) / n
        m.skills_extracted_pct = sum(1 for r in successful if len(r.skills) > 0) / n
        m.experience_extracted_pct = sum(1 for r in successful if r.experience_count > 0) / n
        
        # Quality validation (of those extracted, how many pass format checks)
        name_extracted = [r for r in successful if r.name]
        email_extracted = [r for r in successful if r.email]
        phone_extracted = [r for r in successful if r.phone]
        
        def get_check(result, field_name):
            for c in result.quality_checks:
                if c['field'] == field_name:
                    return c
            return None
        
        if name_extracted:
            m.name_valid_pct = sum(
                1 for r in name_extracted 
                if get_check(r, 'name') and get_check(r, 'name')['valid_format']
            ) / len(name_extracted)
        
        if email_extracted:
            m.email_valid_pct = sum(
                1 for r in email_extracted 
                if get_check(r, 'email') and get_check(r, 'email')['valid_format']
            ) / len(email_extracted)
        
        if phone_extracted:
            m.phone_valid_pct = sum(
                1 for r in phone_extracted 
                if get_check(r, 'phone') and get_check(r, 'phone')['valid_format']
            ) / len(phone_extracted)
        
        # Stats
        m.avg_skills_count = sum(len(r.skills) for r in successful) / n
        m.avg_experience_count = sum(r.experience_count for r in successful) / n
        m.avg_processing_time_ms = sum(r.processing_time_ms for r in successful) / n
        m.avg_quality_score = sum(r.quality_score for r in successful) / n
        
        # Overall rates
        m.overall_extraction_rate = (
            m.name_extracted_pct + m.email_extracted_pct + m.phone_extracted_pct +
            m.skills_extracted_pct + m.experience_extracted_pct
        ) / 5
        
        m.overall_quality_rate = m.avg_quality_score
        
        return m
    
    def _print_report(self, m: AggregateMetrics, results: List[ResumeResult]):
        """Print formatted accuracy report"""
        
        print(f"{'='*70}")
        print(f"  📊 ACCURACY TEST RESULTS")
        print(f"{'='*70}")
        
        # Overall summary
        print(f"\n  📝 Total Resumes Tested:  {m.total_resumes}")
        print(f"  ✅ Successfully Parsed:   {m.successful_parses} ({m.successful_parses/m.total_resumes:.0%})")
        print(f"  ❌ Failed to Parse:       {m.failed_parses} ({m.failed_parses/m.total_resumes:.0%})")
        print(f"  ⏱️  Avg Processing Time:  {m.avg_processing_time_ms:.0f}ms")
        
        # Extraction Coverage
        print(f"\n  {'─'*60}")
        print(f"  📋 EXTRACTION COVERAGE (% of resumes where field was found)")
        print(f"  {'─'*60}")
        
        fields = [
            ("Name",       m.name_extracted_pct),
            ("Email",      m.email_extracted_pct),
            ("Phone",      m.phone_extracted_pct),
            ("Skills",     m.skills_extracted_pct),
            ("Experience", m.experience_extracted_pct),
        ]
        
        for field_name, pct in fields:
            bar_len = 30
            filled = int(bar_len * pct)
            bar = '#' * filled + '-' * (bar_len - filled)
            status = '[OK]' if pct >= 0.8 else ('[!!]' if pct >= 0.5 else '[XX]')
            print(f"    {status} {field_name:<12} [{bar}] {pct:6.1%}")
        
        print(f"\n    📈 Overall Extraction Rate: {m.overall_extraction_rate:.1%}")
        
        # Quality Metrics
        print(f"\n  {'─'*60}")
        print(f"  🔍 FORMAT QUALITY (% of extracted values with valid format)")
        print(f"  {'─'*60}")
        
        quality_fields = [
            ("Name (valid format)",  m.name_valid_pct),
            ("Email (valid format)", m.email_valid_pct),
            ("Phone (valid format)", m.phone_valid_pct),
        ]
        
        for field_name, pct in quality_fields:
            bar_len = 30
            filled = int(bar_len * pct)
            bar = '#' * filled + '-' * (bar_len - filled)
            status = '[OK]' if pct >= 0.8 else ('[!!]' if pct >= 0.5 else '[XX]')
            print(f"    {status} {field_name:<22} [{bar}] {pct:6.1%}")
        
        # Statistics
        print(f"\n  {'─'*60}")
        print(f"  📊 EXTRACTION STATISTICS")
        print(f"  {'─'*60}")
        print(f"    Avg Skills per Resume:     {m.avg_skills_count:.1f}")
        print(f"    Avg Experience Entries:     {m.avg_experience_count:.1f}")
        print(f"    Avg Quality Score:         {m.avg_quality_score:.1%}")
        
        # Overall Score
        print(f"\n  {'='*60}")
        overall = m.overall_quality_rate
        grade = (
            'A+' if overall >= 0.95 else
            'A'  if overall >= 0.90 else
            'B+' if overall >= 0.85 else
            'B'  if overall >= 0.80 else
            'C+' if overall >= 0.75 else
            'C'  if overall >= 0.70 else
            'D'  if overall >= 0.60 else
            'F'
        )
        print(f"  🏆 OVERALL QUALITY SCORE: {overall:.1%} (Grade: {grade})")
        print(f"  {'='*60}")
        
        # Show worst performers
        failed = [r for r in results if not r.success]
        low_quality = sorted(
            [r for r in results if r.success],
            key=lambda r: r.quality_score
        )[:5]
        
        if failed:
            print(f"\n  ⚠️  Failed Resumes ({len(failed)}):")
            for r in failed[:5]:
                print(f"    ❌ {r.filename}: {r.error}")
        
        if low_quality:
            print(f"\n  ⚠️  Lowest Quality Scores:")
            for r in low_quality:
                print(f"    📄 {r.filename}: {r.quality_score:.0%}", end="")
                issues = [c['issue'] for c in r.quality_checks if c.get('issue')]
                if issues:
                    print(f" — {'; '.join(issues[:3])}")
                else:
                    print()
        
        print()
    
    def _generate_ground_truth_template(self, results: List[ResumeResult], test_path: Path):
        """Generate ground truth JSON templates for manual review"""
        template_dir = test_path.parent / "test_data" / "ground_truth_review"
        template_dir.mkdir(parents=True, exist_ok=True)
        
        templates = []
        for r in results:
            if not r.success:
                continue
            
            template = {
                "filename": r.filename,
                "_instructions": "Review and correct the extracted values below. Mark 'is_correct' as true/false for each field.",
                "name": {
                    "extracted": r.name,
                    "correct_value": r.name,  # Pre-fill for review
                    "is_correct": None  # To be filled by reviewer
                },
                "email": {
                    "extracted": r.email,
                    "correct_value": r.email,
                    "is_correct": None
                },
                "phone": {
                    "extracted": r.phone,
                    "correct_value": r.phone,
                    "is_correct": None
                },
                "skills": {
                    "extracted": r.skills,
                    "correct_value": r.skills,
                    "is_correct": None,
                    "missing_skills": [],
                    "wrong_skills": []
                },
                "experience": {
                    "extracted_count": r.experience_count,
                    "extracted_details": r.experience_details,
                    "correct_count": r.experience_count,
                    "is_correct": None
                }
            }
            templates.append(template)
        
        # Save review template
        template_file = template_dir / "review_template.json"
        with open(template_file, 'w', encoding='utf-8') as f:
            json.dump(templates, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Ground truth review template saved to: {template_file}")
        print(f"  📝 Manual review template saved to:")
        print(f"     {template_file}")
        print(f"     Review and fill in 'is_correct' fields to compute true accuracy.\n")


# ─── Entry Point ────────────────────────────────────────────────────────────

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Test Resume Parser Accuracy")
    parser.add_argument(
        "--test-dir", 
        default=str(Path(__file__).parent / "INFORMATION-TECHNOLOGY"),
        help="Directory containing resume PDFs (default: INFORMATION-TECHNOLOGY/)"
    )
    parser.add_argument(
        "--sample", 
        type=int, 
        default=None,
        help="Number of resumes to test (default: all)"
    )
    parser.add_argument(
        "--verbose", 
        action="store_true",
        help="Show per-resume extraction details"
    )
    parser.add_argument(
        "--output", 
        default="accuracy_test_results.json",
        help="Output JSON file (default: accuracy_test_results.json)"
    )
    
    args = parser.parse_args()
    
    # Run tests
    tester = AccuracyTester()
    results = tester.run_test(
        test_dir=args.test_dir,
        sample_size=args.sample,
        verbose=args.verbose
    )
    
    if results:
        # Save full results to JSON
        output_path = Path(__file__).parent / args.output
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"  💾 Full results saved to: {output_path}")
        print(f"     Contains detailed per-resume extraction data.\n")


if __name__ == "__main__":
    main()
