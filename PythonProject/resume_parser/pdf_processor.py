"""
PDF Processing Module
Extracts text from PDF files using pdfplumber with error handling
"""
import pdfplumber
import logging
from typing import Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class PDFProcessor:
    """Handles PDF text extraction with robust error handling"""
    
    def __init__(self):
        """Initialize PDF processor"""
        logger.info("PDFProcessor initialized")
    
    def extract_text(self, pdf_path: str) -> Optional[str]:
        """
        Extract text from PDF file page by page
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Extracted text as a single string, or None if extraction fails
        """
        try:
            pdf_file = Path(pdf_path)
            
            if not pdf_file.exists():
                logger.error(f"PDF file not found: {pdf_path}")
                return None
            
            if not pdf_file.suffix.lower() == '.pdf':
                logger.error(f"File is not a PDF: {pdf_path}")
                return None
            
            text_content = []
            
            with pdfplumber.open(pdf_path) as pdf:
                total_pages = len(pdf.pages)
                logger.info(f"Processing {total_pages} pages from {pdf_file.name}")
                
                for page_num, page in enumerate(pdf.pages, start=1):
                    try:
                        page_text = page.extract_text()
                        
                        if page_text:
                            # Clean and normalize whitespace
                            page_text = self._clean_text(page_text)
                            text_content.append(page_text)
                            logger.debug(f"Page {page_num}/{total_pages}: Extracted {len(page_text)} characters")
                        else:
                            logger.warning(f"Page {page_num}/{total_pages}: No text extracted (empty page)")
                    
                    except Exception as page_error:
                        logger.error(f"Error extracting text from page {page_num}: {page_error}")
                        continue
            
            if not text_content:
                logger.error("No text extracted from any page")
                return None
            
            full_text = "\n\n".join(text_content)
            logger.info(f"Successfully extracted {len(full_text)} characters from {total_pages} pages")
            
            return full_text
        
        except pdfplumber.pdfminer.pdfparser.PDFSyntaxError as e:
            logger.error(f"Corrupted PDF file: {e}")
            return None
        
        except Exception as e:
            logger.error(f"Unexpected error processing PDF: {e}")
            return None
    
    def extract_text_from_bytes(self, pdf_bytes: bytes) -> Optional[str]:
        """
        Extract text from PDF byte content
        
        Args:
            pdf_bytes: Bytes of the PDF file
            
        Returns:
            Extracted text as a single string, or None if extraction fails
        """
        try:
            import io
            text_content = []
            
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                total_pages = len(pdf.pages)
                for page_num, page in enumerate(pdf.pages, start=1):
                    try:
                        page_text = page.extract_text()
                        if page_text:
                            page_text = self._clean_text(page_text)
                            text_content.append(page_text)
                    except Exception as page_error:
                        logger.error(f"Error extracting text from page {page_num}: {page_error}")
                        continue
            
            if not text_content:
                return None
            
            return "\n\n".join(text_content)
        except Exception as e:
            logger.error(f"Unexpected error processing PDF bytes: {e}")
            return None

    def _clean_text(self, text: str) -> str:
        """
        Clean and normalize extracted text
        
        Args:
            text: Raw text from PDF
            
        Returns:
            Cleaned text
        """
        if not text:
            return ""
        
        # Replace multiple whitespace with single space
        import re
        text = re.sub(r'\s+', ' ', text)
        
        # Remove extra newlines
        text = re.sub(r'\n\s*\n', '\n\n', text)
        
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def extract_text_from_bytes(self, pdf_bytes: bytes) -> Optional[str]:
        """
        Extract text from PDF bytes (for FastAPI file uploads)
        
        Args:
            pdf_bytes: PDF file content as bytes
            
        Returns:
            Extracted text as a single string, or None if extraction fails
        """
        try:
            import io
            text_content = []
            
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                total_pages = len(pdf.pages)
                logger.info(f"Processing {total_pages} pages from uploaded PDF")
                
                for page_num, page in enumerate(pdf.pages, start=1):
                    try:
                        page_text = page.extract_text()
                        
                        if page_text:
                            page_text = self._clean_text(page_text)
                            text_content.append(page_text)
                            logger.debug(f"Page {page_num}/{total_pages}: Extracted {len(page_text)} characters")
                        else:
                            logger.warning(f"Page {page_num}/{total_pages}: No text extracted (empty page)")
                    
                    except Exception as page_error:
                        logger.error(f"Error extracting text from page {page_num}: {page_error}")
                        continue
            
            if not text_content:
                logger.error("No text extracted from any page")
                return None
            
            full_text = "\n\n".join(text_content)
            logger.info(f"Successfully extracted {len(full_text)} characters from {total_pages} pages")
            
            return full_text
        
        except Exception as e:
            logger.error(f"Error processing PDF bytes: {e}")
            return None


# Module-level function for direct usage
def extract_text_from_pdf(pdf_path: str) -> Optional[str]:
    """
    Convenience function to extract text from PDF
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        Extracted text
    """
    processor = PDFProcessor()
    return processor.extract_text(pdf_path)
