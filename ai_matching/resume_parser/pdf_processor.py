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
    
    def _clean_text(self, text: str) -> str:
        """
        Clean and normalize extracted text while PRESERVING line structure.
        The section detector relies on newlines to detect headings.
        
        Args:
            text: Raw text from PDF
            
        Returns:
            Cleaned text with preserved line breaks
        """
        if not text:
            return ""
        
        import re
        
        # Remove CID references from icon fonts (e.g. FontAwesome phone/email icons)
        # These appear as (cid:NNN) and corrupt entity extraction
        text = re.sub(r'\(cid:\d+\)', ' ', text)
        
        # Remove other common PDF artifacts
        text = re.sub(r'\x00', '', text)  # null bytes
        text = re.sub(r'\ufeff', '', text)  # BOM
        
        # Normalize horizontal whitespace ONLY (tabs, multiple spaces) but KEEP newlines
        text = re.sub(r'[^\S\n]+', ' ', text)
        
        # Collapse 3+ consecutive blank lines into 2
        text = re.sub(r'\n\s*\n\s*\n', '\n\n', text)
        
        # Strip leading/trailing whitespace from each line
        lines = text.split('\n')
        lines = [line.strip() for line in lines]
        text = '\n'.join(lines)
        
        # Strip leading/trailing whitespace from the whole text
        text = text.strip()
        
        return text
    
    def extract_text_from_bytes(self, pdf_bytes: bytes) -> Optional[str]:
        """
        Extract text from PDF bytes (for FastAPI file uploads).
        Uses layout-preserving extraction to maintain line structure.
        
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
                        # Try standard extraction first
                        page_text = page.extract_text()
                        
                        # If standard extraction yields very little text,
                        # try layout-preserving mode which handles complex PDFs better
                        if not page_text or len(page_text.strip()) < 50:
                            try:
                                layout_text = page.extract_text(
                                    layout=True,
                                    x_density=3,
                                    y_density=3,
                                )
                                if layout_text and len(layout_text.strip()) > len((page_text or "").strip()):
                                    page_text = layout_text
                            except Exception:
                                pass  # layout mode not available in older pdfplumber
                        
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
