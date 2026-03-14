"""
Entity Extraction Module
Extracts name, email, and phone using spaCy NER and regex patterns
"""
import spacy
import logging
from typing import Optional, Tuple
import re
from config import EMAIL_PATTERN, PHONE_PATTERN, MIN_NAME_WORDS, MAX_NAME_WORDS

logger = logging.getLogger(__name__)


class EntityExtractor:
    """Extracts personal information entities from resume text"""
    
    def __init__(self, model_name: str = "en_core_web_trf"):
        """
        Initialize entity extractor with spaCy model
        
        Args:
            model_name: spaCy model to use (default: transformer-based)
        """
        try:
            logger.info(f"Loading spaCy model: {model_name}")
            self.nlp = spacy.load(model_name)
            logger.info("spaCy model loaded successfully")
        except OSError:
            logger.warning(f"Model {model_name} not found. Attempting to download...")
            import subprocess
            subprocess.run(["python", "-m", "spacy", "download", model_name], check=True)
            self.nlp = spacy.load(model_name)
            logger.info("spaCy model downloaded and loaded successfully")
    
    def extract_name(self, text: str) -> Optional[str]:
        """
        Extract person name using spaCy NER
        
        Strategy:
        1. Use spaCy to detect PERSON entities
        2. Return the first detected person name (usually candidate's name)
        3. Validate name length (2-4 words typical for names)
        
        Args:
            text: Resume text
            
        Returns:
            Extracted name or None
        """
        try:
            # Process first 1000 characters (name usually in header)
            doc = self.nlp(text[:1000])
            
            # Find all PERSON entities
            person_entities = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
            
            if not person_entities:
                logger.warning("No PERSON entities found")
                return None
            
            # Take the first person entity (most likely the candidate)
            for candidate_name in person_entities:
                # Validate name structure
                name_words = candidate_name.strip().split()
                if MIN_NAME_WORDS <= len(name_words) <= MAX_NAME_WORDS:
                    logger.info(f"Extracted name: {candidate_name}")
                    return candidate_name.strip()
            
            # Fallback: return first person entity even if length doesn't match
            name = person_entities[0].strip()
            logger.info(f"Extracted name (fallback): {name}")
            return name
        
        except Exception as e:
            logger.error(f"Error extracting name: {e}")
            return None
    
    def extract_email(self, text: str) -> Optional[str]:
        """
        Extract email address using regex
        
        Args:
            text: Resume text
            
        Returns:
            Extracted email or None
        """
        try:
            matches = EMAIL_PATTERN.findall(text)
            
            if not matches:
                logger.warning("No email address found")
                return None
            
            # Return the first email found
            email = matches[0].strip()
            logger.info(f"Extracted email: {email}")
            return email
        
        except Exception as e:
            logger.error(f"Error extracting email: {e}")
            return None
    
    def extract_phone(self, text: str) -> Optional[str]:
        """
        Extract phone number using regex
        
        Supports formats:
        - +1 555-123-4567
        - (555) 123-4567
        - 555.123.4567
        - +91 9876543210
        
        Args:
            text: Resume text
            
        Returns:
            Extracted phone number or None
        """
        try:
            matches = PHONE_PATTERN.findall(text)
            
            if not matches:
                logger.warning("No phone number found")
                return None
            
            # Return the first phone number found
            phone = matches[0].strip()
            
            # Clean up phone number (remove extra spaces/special chars)
            phone = re.sub(r'\s+', ' ', phone)
            
            logger.info(f"Extracted phone: {phone}")
            return phone
        
        except Exception as e:
            logger.error(f"Error extracting phone: {e}")
            return None
    
    def extract_all_entities(self, text: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
        """
        Extract all entities (name, email, phone) in one pass
        
        Args:
            text: Resume text
            
        Returns:
            Tuple of (name, email, phone)
        """
        name = self.extract_name(text)
        email = self.extract_email(text)
        phone = self.extract_phone(text)
        
        return name, email, phone


# Module-level function for direct usage
def extract_entities(text: str, model_name: str = "en_core_web_trf") -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Convenience function to extract all entities
    
    Args:
        text: Resume text
        model_name: spaCy model to use
        
    Returns:
        Tuple of (name, email, phone)
    """
    extractor = EntityExtractor(model_name)
    return extractor.extract_all_entities(text)
