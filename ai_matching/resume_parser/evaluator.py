"""
Evaluation Module
Measures field-level accuracy of resume parsing
"""
import json
import logging
from pathlib import Path
from typing import List, Dict, Tuple
import argparse

from schemas import ResumeData, GroundTruth, EvaluationMetrics, FieldMetrics
from pdf_processor import PDFProcessor
from entity_extractor import EntityExtractor
from experience_extractor import ExperienceExtractor
from skills_extractor import SkillsExtractor

logger = logging.getLogger(__name__)


class ResumeEvaluator:
    """Evaluates resume parsing accuracy against ground truth"""
    
    def __init__(self):
        """Initialize evaluator with extractors"""
        self.pdf_processor = PDFProcessor()
        self.entity_extractor = EntityExtractor()
        self.experience_extractor = ExperienceExtractor()
        self.skills_extractor = SkillsExtractor()
    
    def evaluate_field(self, predicted: str, ground_truth: str, 
                      fuzzy: bool = False) -> FieldMetrics:
        """
        Evaluate a single text field
        
        Args:
            predicted: Predicted value
            ground_truth: Ground truth value
            fuzzy: Use fuzzy matching (case-insensitive, strip whitespace)
            
        Returns:
            FieldMetrics with precision, recall, F1, accuracy
        """
        if ground_truth is None:
            # No ground truth available
            return FieldMetrics(precision=0.0, recall=0.0, f1_score=0.0, accuracy=0.0)
        
        if predicted is None:
            # Failed to extract
            return FieldMetrics(precision=0.0, recall=0.0, f1_score=0.0, accuracy=0.0)
        
        # Exact or fuzzy matching
        if fuzzy:
            match = predicted.strip().lower() == ground_truth.strip().lower()
        else:
            match = predicted == ground_truth
        
        accuracy = 1.0 if match else 0.0
        
        # For single fields, precision/recall/F1 are same as accuracy
        return FieldMetrics(
            precision=accuracy,
            recall=accuracy,
            f1_score=accuracy,
            accuracy=accuracy
        )
    
    def evaluate_skills(self, predicted: List[str], ground_truth: List[str]) -> FieldMetrics:
        """
        Evaluate skills field using set-based metrics
        
        Args:
            predicted: Predicted skills list
            ground_truth: Ground truth skills list
            
        Returns:
            FieldMetrics with precision, recall, F1
        """
        if not ground_truth:
            return FieldMetrics(precision=0.0, recall=0.0, f1_score=0.0, accuracy=0.0)
        
        # Convert to lowercase sets for comparison
        pred_set = set(skill.lower() for skill in predicted)
        gt_set = set(skill.lower() for skill in ground_truth)
        
        # Calculate metrics
        true_positives = len(pred_set & gt_set)
        false_positives = len(pred_set - gt_set)
        false_negatives = len(gt_set - pred_set)
        
        # Precision: TP / (TP + FP)
        precision = true_positives / (true_positives + false_positives) if (true_positives + false_positives) > 0 else 0.0
        
        # Recall: TP / (TP + FN)
        recall = true_positives / (true_positives + false_negatives) if (true_positives + false_negatives) > 0 else 0.0
        
        # F1 Score: 2 * (precision * recall) / (precision + recall)
        f1_score = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        
        # Accuracy: Jaccard similarity (intersection over union)
        accuracy = true_positives / len(pred_set | gt_set) if len(pred_set | gt_set) > 0 else 0.0
        
        return FieldMetrics(
            precision=precision,
            recall=recall,
            f1_score=f1_score,
            accuracy=accuracy
        )
    
    def evaluate_experience(self, predicted: List, ground_truth: List) -> FieldMetrics:
        """
        Evaluate experience field (simplified: count-based)
        
        Args:
            predicted: Predicted experience list
            ground_truth: Ground truth experience list
            
        Returns:
            FieldMetrics
        """
        if not ground_truth:
            return FieldMetrics(precision=0.0, recall=0.0, f1_score=0.0, accuracy=0.0)
        
        # Simple metric: number of experiences extracted
        pred_count = len(predicted)
        gt_count = len(ground_truth)
        
        if gt_count == 0:
            accuracy = 1.0 if pred_count == 0 else 0.0
        else:
            # Accuracy based on count match
            accuracy = min(pred_count, gt_count) / max(pred_count, gt_count)
        
        return FieldMetrics(
            precision=accuracy,
            recall=accuracy,
            f1_score=accuracy,
            accuracy=accuracy
        )
    
    def evaluate_resume(self, predicted: ResumeData, ground_truth: GroundTruth) -> EvaluationMetrics:
        """
        Evaluate all fields of a resume
        
        Args:
            predicted: Predicted resume data
            ground_truth: Ground truth data
            
        Returns:
            EvaluationMetrics
        """
        # Evaluate each field
        name_metrics = self.evaluate_field(predicted.name, ground_truth.name, fuzzy=True)
        email_metrics = self.evaluate_field(predicted.email, ground_truth.email, fuzzy=True)
        phone_metrics = self.evaluate_field(predicted.phone, ground_truth.phone, fuzzy=False)
        skills_metrics = self.evaluate_skills(predicted.skills, ground_truth.skills)
        experience_metrics = self.evaluate_experience(predicted.experience, ground_truth.experience)
        
        # Calculate overall accuracy (weighted average)
        overall_accuracy = (
            name_metrics.accuracy * 0.2 +
            email_metrics.accuracy * 0.2 +
            phone_metrics.accuracy * 0.15 +
            skills_metrics.accuracy * 0.25 +
            experience_metrics.accuracy * 0.2
        )
        
        return EvaluationMetrics(
            name_metrics=name_metrics,
            email_metrics=email_metrics,
            phone_metrics=phone_metrics,
            skills_metrics=skills_metrics,
            experience_metrics=experience_metrics,
            overall_accuracy=overall_accuracy
        )
    
    def evaluate_dataset(self, test_dir: str) -> Dict:
        """
        Evaluate all resumes in a test directory
        
        Expected structure:
        test_dir/
            resume1.pdf
            resume1_ground_truth.json
            resume2.pdf
            resume2_ground_truth.json
        
        Args:
            test_dir: Directory containing test PDFs and ground truth JSON files
            
        Returns:
            Dictionary with aggregated metrics
        """
        test_path = Path(test_dir)
        
        if not test_path.exists():
            logger.error(f"Test directory not found: {test_dir}")
            return {}
        
        # Find all PDF files
        pdf_files = list(test_path.glob("*.pdf"))
        
        if not pdf_files:
            logger.error("No PDF files found in test directory")
            return {}
        
        logger.info(f"Found {len(pdf_files)} PDF files for evaluation")
        
        all_metrics = []
        detailed_results = []
        
        for pdf_file in pdf_files:
            # Find corresponding ground truth file
            gt_file = pdf_file.with_name(f"{pdf_file.stem}_ground_truth.json")
            
            if not gt_file.exists():
                logger.warning(f"Ground truth not found for {pdf_file.name}, skipping")
                continue
            
            # Load ground truth
            with open(gt_file, 'r', encoding='utf-8') as f:
                gt_data = json.load(f)
                ground_truth = GroundTruth(**gt_data)
            
            # Parse resume
            text = self.pdf_processor.extract_text(str(pdf_file))
            
            if not text:
                logger.error(f"Failed to extract text from {pdf_file.name}")
                continue
            
            # Extract all fields
            name, email, phone = self.entity_extractor.extract_all_entities(text)
            skills = self.skills_extractor.extract_skills(text)
            experience = self.experience_extractor.extract_experiences(text)
            
            predicted = ResumeData(
                name=name,
                email=email,
                phone=phone,
                skills=skills,
                experience=experience
            )
            
            # Evaluate
            metrics = self.evaluate_resume(predicted, ground_truth)
            all_metrics.append(metrics)
            
            detailed_results.append({
                "filename": pdf_file.name,
                "metrics": metrics.model_dump(),
                "predicted": predicted.model_dump(exclude={"raw_text"}),
                "ground_truth": ground_truth.model_dump()
            })
            
            logger.info(f"✅ {pdf_file.name}: Overall Accuracy = {metrics.overall_accuracy:.2%}")
        
        # Aggregate metrics
        if not all_metrics:
            logger.error("No resumes were successfully evaluated")
            return {}
        
        avg_metrics = self._aggregate_metrics(all_metrics)
        
        return {
            "summary": avg_metrics,
            "detailed_results": detailed_results,
            "total_resumes": len(all_metrics)
        }
    
    def _aggregate_metrics(self, metrics_list: List[EvaluationMetrics]) -> Dict:
        """
        Aggregate metrics across multiple resumes
        
        Args:
            metrics_list: List of EvaluationMetrics
            
        Returns:
            Dictionary with averaged metrics
        """
        n = len(metrics_list)
        
        def avg_field_metrics(field_name: str) -> Dict:
            return {
                "precision": sum(getattr(m, field_name).precision for m in metrics_list) / n,
                "recall": sum(getattr(m, field_name).recall for m in metrics_list) / n,
                "f1_score": sum(getattr(m, field_name).f1_score for m in metrics_list) / n,
                "accuracy": sum(getattr(m, field_name).accuracy for m in metrics_list) / n,
            }
        
        return {
            "name_metrics": avg_field_metrics("name_metrics"),
            "email_metrics": avg_field_metrics("email_metrics"),
            "phone_metrics": avg_field_metrics("phone_metrics"),
            "skills_metrics": avg_field_metrics("skills_metrics"),
            "experience_metrics": avg_field_metrics("experience_metrics"),
            "overall_accuracy": sum(m.overall_accuracy for m in metrics_list) / n
        }


def print_metrics(results: Dict):
    """Pretty print evaluation results"""
    print("\n" + "="*60)
    print("RESUME PARSER EVALUATION RESULTS")
    print("="*60)
    
    if "summary" in results:
        summary = results["summary"]
        
        print(f"\n📊 Overall Accuracy: {summary['overall_accuracy']:.2%}")
        print(f"📝 Total Resumes Evaluated: {results['total_resumes']}")
        
        print("\n" + "-"*60)
        print("Field-Level Metrics:")
        print("-"*60)
        
        for field in ["name", "email", "phone", "skills", "experience"]:
            metrics = summary[f"{field}_metrics"]
            print(f"\n{field.upper()}:")
            print(f"  Accuracy:  {metrics['accuracy']:.2%}")
            print(f"  Precision: {metrics['precision']:.2%}")
            print(f"  Recall:    {metrics['recall']:.2%}")
            print(f"  F1 Score:  {metrics['f1_score']:.2%}")
        
        print("\n" + "="*60)


def main():
    """CLI for evaluation"""
    parser = argparse.ArgumentParser(description="Evaluate Resume Parser")
    parser.add_argument("--test-dir", required=True, help="Directory containing test PDFs and ground truth")
    parser.add_argument("--output", default="evaluation_results.json", help="Output JSON file")
    
    args = parser.parse_args()
    
    evaluator = ResumeEvaluator()
    results = evaluator.evaluate_dataset(args.test_dir)
    
    if results:
        # Print results
        print_metrics(results)
        
        # Save to JSON
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2)
        
        print(f"\n✅ Results saved to {args.output}")


if __name__ == "__main__":
    main()
