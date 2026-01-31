"""
CV Parser Service
Handles text extraction from PDF and DOCX resume files
"""
from typing import Optional
import io


class CVParser:
    """Service for extracting text from CV/Resume files"""
    
    def extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text from PDF file content"""
        try:
            from PyPDF2 import PdfReader
            pdf_file = io.BytesIO(file_content)
            reader = PdfReader(pdf_file)
            
            text_content = []
            for page in reader.pages:
                text_content.append(page.extract_text() or "")
            
            return "\n".join(text_content)
        except ImportError:
            raise ImportError("PyPDF2 is required. Install with: pip install PyPDF2")
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")
    
    def extract_text_from_docx(self, file_content: bytes) -> str:
        """Extract text from DOCX file content"""
        try:
            from docx import Document
            docx_file = io.BytesIO(file_content)
            doc = Document(docx_file)
            
            text_content = []
            for para in doc.paragraphs:
                text_content.append(para.text)
            
            return "\n".join(text_content)
        except ImportError:
            raise ImportError("python-docx is required. Install with: pip install python-docx")
        except Exception as e:
            raise ValueError(f"Failed to extract text from DOCX: {str(e)}")
    
    def extract_text(self, file_content: bytes, file_type: str) -> str:
        """
        Extract text from CV file based on file type
        
        Args:
            file_content: Raw file bytes
            file_type: File extension (pdf, docx)
        
        Returns:
            Extracted text content
        """
        file_type = file_type.lower().strip(".")
        
        if file_type == "pdf":
            return self.extract_text_from_pdf(file_content)
        elif file_type in ("docx", "doc"):
            return self.extract_text_from_docx(file_content)
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize extracted text"""
        import re
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,;:\-@#&+()]', '', text)
        # Strip leading/trailing whitespace
        text = text.strip()
        
        return text


# Singleton instance
cv_parser = CVParser()
