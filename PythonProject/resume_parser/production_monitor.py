"""
Production Monitoring Module
Track parsing accuracy and performance in production
"""
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List
from collections import defaultdict
import statistics

try:
    # Package mode: `uvicorn resume_parser.main:app`
    from .schemas import ResumeData, FieldMetrics
except ImportError:
    # Script mode: `uvicorn main:app` from resume_parser directory
    from schemas import ResumeData, FieldMetrics

logger = logging.getLogger(__name__)


class ProductionMonitor:
    """Monitor resume parsing performance in production"""
    
    def __init__(self, log_dir: str = "logs"):
        """
        Initialize production monitor
        
        Args:
            log_dir: Directory to store metrics logs
        """
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # In-memory metrics (for current session)
        self.metrics = {
            "total_requests": 0,
            "successful_parses": 0,
            "failed_parses": 0,
            "processing_times": [],
            "field_extraction_rates": defaultdict(int),
            "confidence_scores": [],
        }
        
        logger.info(f"ProductionMonitor initialized, logging to {log_dir}")
    
    def log_parse_result(
        self, 
        filename: str,
        resume_data: Optional[ResumeData],
        processing_time_ms: float,
        success: bool,
        error: Optional[str] = None
    ):
        """
        Log a parsing result for monitoring
        
        Args:
            filename: Name of the parsed file
            resume_data: Parsed resume data (if successful)
            processing_time_ms: Processing time in milliseconds
            success: Whether parsing was successful
            error: Error message if failed
        """
        self.metrics["total_requests"] += 1
        
        if success:
            self.metrics["successful_parses"] += 1
        else:
            self.metrics["failed_parses"] += 1
        
        self.metrics["processing_times"].append(processing_time_ms)
        
        # Track field extraction rates
        if resume_data:
            if resume_data.name:
                self.metrics["field_extraction_rates"]["name"] += 1
            if resume_data.email:
                self.metrics["field_extraction_rates"]["email"] += 1
            if resume_data.phone:
                self.metrics["field_extraction_rates"]["phone"] += 1
            if resume_data.skills:
                self.metrics["field_extraction_rates"]["skills"] += 1
            if resume_data.experience:
                self.metrics["field_extraction_rates"]["experience"] += 1
            
            # Calculate confidence score
            confidence = self._calculate_confidence(resume_data)
            self.metrics["confidence_scores"].append(confidence)
        
        # Write to log file
        self._write_log_entry(filename, resume_data, processing_time_ms, success, error)
    
    def _calculate_confidence(self, resume_data: ResumeData) -> float:
        """
        Calculate confidence score for parsed data
        
        Simple heuristic: percentage of fields successfully extracted
        
        Args:
            resume_data: Parsed resume data
            
        Returns:
            Confidence score (0.0 - 1.0)
        """
        score = 0.0
        total_fields = 5  # name, email, phone, skills, experience
        
        if resume_data.name:
            score += 0.2
        if resume_data.email and '@' in resume_data.email:
            score += 0.2
        if resume_data.phone:
            score += 0.2
        if resume_data.skills and len(resume_data.skills) > 0:
            score += 0.2
        if resume_data.experience and len(resume_data.experience) > 0:
            score += 0.2
        
        return score
    
    def _write_log_entry(
        self,
        filename: str,
        resume_data: Optional[ResumeData],
        processing_time_ms: float,
        success: bool,
        error: Optional[str]
    ):
        """Write a log entry to file"""
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "filename": filename,
            "success": success,
            "processing_time_ms": processing_time_ms,
            "extracted_fields": {
                "name": resume_data.name if resume_data else None,
                "email": resume_data.email if resume_data else None,
                "phone": resume_data.phone if resume_data else None,
                "num_skills": len(resume_data.skills) if resume_data and resume_data.skills else 0,
                "num_experience": len(resume_data.experience) if resume_data and resume_data.experience else 0,
            } if resume_data else None,
            "error": error
        }
        
        # Append to daily log file
        log_file = self.log_dir / f"parse_log_{datetime.utcnow().date()}.jsonl"
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(log_entry) + '\n')
    
    def get_current_metrics(self) -> Dict:
        """
        Get current session metrics
        
        Returns:
            Dictionary of current metrics
        """
        total = self.metrics["total_requests"]
        
        if total == 0:
            return {"message": "No requests processed yet"}
        
        # Calculate extraction rates
        extraction_rates = {}
        for field, count in self.metrics["field_extraction_rates"].items():
            extraction_rates[f"{field}_rate"] = count / self.metrics["successful_parses"] if self.metrics["successful_parses"] > 0 else 0.0
        
        return {
            "total_requests": total,
            "successful_parses": self.metrics["successful_parses"],
            "failed_parses": self.metrics["failed_parses"],
            "success_rate": self.metrics["successful_parses"] / total,
            "avg_processing_time_ms": statistics.mean(self.metrics["processing_times"]) if self.metrics["processing_times"] else 0,
            "median_processing_time_ms": statistics.median(self.metrics["processing_times"]) if self.metrics["processing_times"] else 0,
            "extraction_rates": extraction_rates,
            "avg_confidence_score": statistics.mean(self.metrics["confidence_scores"]) if self.metrics["confidence_scores"] else 0,
        }
    
    def log_human_feedback(
        self,
        filename: str,
        field: str,
        predicted_value: str,
        correct_value: str,
        is_correct: bool
    ):
        """
        Log human feedback for accuracy tracking
        
        Args:
            filename: Resume filename
            field: Field name (name, email, phone, skills, experience)
            predicted_value: What the model predicted
            correct_value: Correct value from human reviewer
            is_correct: Whether prediction was correct
        """
        feedback_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "filename": filename,
            "field": field,
            "predicted_value": predicted_value,
            "correct_value": correct_value,
            "is_correct": is_correct
        }
        
        feedback_file = self.log_dir / "human_feedback.jsonl"
        with open(feedback_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(feedback_entry) + '\n')
        
        logger.info(f"Human feedback logged for {filename}, field={field}, correct={is_correct}")
    
    def calculate_accuracy_from_feedback(self) -> Dict:
        """
        Calculate accuracy metrics from human feedback logs
        
        Returns:
            Dictionary with per-field accuracy from human feedback
        """
        feedback_file = self.log_dir / "human_feedback.jsonl"
        
        if not feedback_file.exists():
            return {"message": "No human feedback data available"}
        
        field_stats = defaultdict(lambda: {"correct": 0, "total": 0})
        
        with open(feedback_file, 'r', encoding='utf-8') as f:
            for line in f:
                entry = json.loads(line)
                field = entry["field"]
                field_stats[field]["total"] += 1
                if entry["is_correct"]:
                    field_stats[field]["correct"] += 1
        
        # Calculate accuracy per field
        accuracy_metrics = {}
        for field, stats in field_stats.items():
            accuracy_metrics[f"{field}_accuracy"] = stats["correct"] / stats["total"] if stats["total"] > 0 else 0.0
            accuracy_metrics[f"{field}_total_samples"] = stats["total"]
        
        # Overall accuracy
        total_correct = sum(stats["correct"] for stats in field_stats.values())
        total_samples = sum(stats["total"] for stats in field_stats.values())
        accuracy_metrics["overall_accuracy"] = total_correct / total_samples if total_samples > 0 else 0.0
        accuracy_metrics["total_feedback_samples"] = total_samples
        
        return accuracy_metrics


# Global monitor instance
monitor = ProductionMonitor()


def get_monitor() -> ProductionMonitor:
    """Get the global production monitor instance"""
    return monitor
