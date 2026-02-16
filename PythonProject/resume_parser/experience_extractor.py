"""
Experience Extraction Module
Extracts work experience entries using rule-based pattern matching
"""
import re
import logging
from typing import List
from schemas import Experience
from config import YEAR_RANGE_PATTERN, MONTH_YEAR_PATTERN

logger = logging.getLogger(__name__)


class ExperienceExtractor:
    """Extracts work experience from resume text"""
    
    def __init__(self):
        """Initialize experience extractor"""
        logger.info("ExperienceExtractor initialized")
    
    def extract_experiences(self, text: str) -> List[Experience]:
        """
        Extract work experience entries from text
        
        Strategy:
        1. Find date ranges (year ranges like 2020-2022 or month-year ranges)
        2. Extract surrounding context as experience blocks
        3. Parse company names and positions from context
        
        Args:
            text: Resume text
            
        Returns:
            List of Experience objects
        """
        try:
            experiences = []
            
            # Find all year ranges
            year_matches = list(YEAR_RANGE_PATTERN.finditer(text))
            
            if not year_matches:
                logger.warning("No year ranges found in text")
                return []
            
            logger.info(f"Found {len(year_matches)} potential experience entries")
            
            for i, match in enumerate(year_matches):
                try:
                    duration = match.group(0).strip()
                    
                    # Extract context around the date (before the date)
                    start_pos = max(0, match.start() - 200)
                    end_pos = min(len(text), match.end() + 200)
                    context = text[start_pos:end_pos]
                    
                    # Split context into lines
                    lines = context.split('\n')
                    
                    # Find the line with the date
                    date_line_idx = None
                    for idx, line in enumerate(lines):
                        if duration in line:
                            date_line_idx = idx
                            break
                    
                    if date_line_idx is None:
                        continue
                    
                    # Extract company and position from surrounding lines
                    company = None
                    position = None
                    description_lines = []
                    
                    # Look backwards from date line for job title and company
                    for idx in range(max(0, date_line_idx - 3), date_line_idx):
                        line = lines[idx].strip()
                        if line and len(line) > 3 and len(line) < 100:
                            # First non-empty line before date is usually position
                            if position is None:
                                position = line
                            # Second line might be company
                            elif company is None:
                                company = line
                    
                    # Look forward from date line for description
                    for idx in range(date_line_idx + 1, min(len(lines), date_line_idx + 5)):
                        line = lines[idx].strip()
                        if line and not YEAR_RANGE_PATTERN.search(line):
                            description_lines.append(line)
                    
                    description = ' '.join(description_lines) if description_lines else None
                    
                    # Create Experience object
                    exp = Experience(
                        company=company,
                        position=position,
                        duration=duration,
                        description=description[:200] if description else None  # Limit description length
                    )
                    
                    experiences.append(exp)
                    logger.debug(f"Extracted experience: {position} at {company} ({duration})")
                
                except Exception as e:
                    logger.error(f"Error processing experience match {i}: {e}")
                    continue
            
            # Remove duplicates based on duration
            unique_experiences = self._deduplicate_experiences(experiences)
            
            logger.info(f"Extracted {len(unique_experiences)} unique experience entries")
            return unique_experiences
        
        except Exception as e:
            logger.error(f"Error extracting experiences: {e}")
            return []
    
    def _deduplicate_experiences(self, experiences: List[Experience]) -> List[Experience]:
        """
        Remove duplicate experience entries
        
        Args:
            experiences: List of Experience objects
            
        Returns:
            Deduplicated list
        """
        seen_durations = set()
        unique = []
        
        for exp in experiences:
            if exp.duration and exp.duration not in seen_durations:
                seen_durations.add(exp.duration)
                unique.append(exp)
        
        return unique
    
    def extract_total_years_experience(self, experiences: List[Experience]) -> float:
        """
        Calculate total years of experience from experience entries
        
        Args:
            experiences: List of Experience objects
            
        Returns:
            Total years of experience
        """
        total_years = 0.0
        
        for exp in experiences:
            if not exp.duration:
                continue
            
            try:
                # Extract years from duration
                years = re.findall(r'(19|20)\d{2}', exp.duration)
                
                if len(years) >= 2:
                    start_year = int(years[0])
                    end_year = int(years[1])
                    total_years += (end_year - start_year)
                elif len(years) == 1 and any(word in exp.duration.lower() for word in ['present', 'current', 'now']):
                    # If "Present", calculate from start year to 2026
                    start_year = int(years[0])
                    total_years += (2026 - start_year)
            
            except Exception as e:
                logger.error(f"Error calculating years for duration {exp.duration}: {e}")
                continue
        
        return total_years


# Module-level function for direct usage
def extract_experience(text: str) -> List[Experience]:
    """
    Convenience function to extract experiences
    
    Args:
        text: Resume text
        
    Returns:
        List of Experience objects
    """
    extractor = ExperienceExtractor()
    return extractor.extract_experiences(text)
