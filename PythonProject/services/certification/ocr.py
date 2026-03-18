
import pytesseract
from PIL import Image
import os
import re
from typing import Dict, Any, Tuple
from datetime import datetime, date
import json
import pdfplumber
from pdf2image import convert_from_path
from docx import Document

# Set Tesseract path for Windows
tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = tesseract_path

def extract_text(file_path: str) -> str:
    """
    Enhanced text extraction that handles multiple formats:
    - Images (PNG, JPG, JPEG)
    - PDF (text-based and OCR fallback)
    - Word Documents (DOCX)
    - Text Files (TXT)
    """
    path = file_path.lower()
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")
            
        if path.endswith(('.png', '.jpg', '.jpeg')):
            return _read_image(file_path)
        elif path.endswith('.pdf'):
            return _read_pdf(file_path)
        elif path.endswith('.docx'):
            return _read_docx(file_path)
        elif path.endswith('.txt'):
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        else:
            # Try OCR as last resort
            return _read_image(file_path)
    except Exception as e:
        print(f"Extraction Error: {e}")
        return ""

import cv2
import numpy as np

def _read_image(path):
    try:
        # Load image with OpenCV
        img = cv2.imread(path)
        if img is None:
            return pytesseract.image_to_string(Image.open(path))
            
        # Pre-processing for better OCR
        # 1. Convert to grayscale
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # 2. Noise Reduction using Bilateral Filter (Preserves edges)
        denoised = cv2.bilateralFilter(gray, 9, 75, 75)
        
        # 3. Rescale (Helpful for small/blurry text)
        rescaled = cv2.resize(denoised, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        
        # 4. Sharpening to make text crisp
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(rescaled, -1, kernel)
        
        # 5. Adaptive Thresholding (Handles varying lighting and light colors better than Otsu)
        thresh = cv2.adaptiveThreshold(
            sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        
        # Run OCR on processed image
        text = pytesseract.image_to_string(thresh, config='--psm 3')
        
        # Fallback to standard Otsu if text is too short
        if len(text.strip()) < 50:
            _, otsu = cv2.threshold(sharpened, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            text = pytesseract.image_to_string(otsu, config='--psm 3')
            
        return text
    except Exception as e:
        print(f"Image OCR error: {e}")
        try:
            return pytesseract.image_to_string(Image.open(path))
        except:
            return ""

def _read_pdf(path):
    text = ""
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text += t + "\n"
    except Exception as e:
        print(f"Pdfplumber error: {e}")

    # OCR fallback if no text found
    if not text.strip():
        try:
            # Convert first page to image and OCR
            images = convert_from_path(path, first_page=1, last_page=1)
            if images:
                text = pytesseract.image_to_string(images[0])
        except Exception as e:
            print(f"PDF OCR error: {e}")
    return text

def _read_docx(path):
    try:
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception as e:
        print(f"Docx read error: {e}")
        return ""

def extract_structured_data_from_ocr(ocr_text: str) -> Dict[str, Any]:
    """
    Extract structured data using the TP-style rule-based parsing.
    This replaces our previous rule-based logic.
    """
    from .tp_extractor import extract_from_text
    
    # Use the TP extractor logic
    tp_data = extract_from_text(ocr_text)
    
    # Map TP fields to our system's fields
    result = {
        "student_name": tp_data['name'].get('value'),
        "organization_name": tp_data['organization'].get('value'),
        "internship_title": tp_data['internship_title'].get('value'),
        "total_hours": _safe_int(tp_data['hours'].get('value')),
        "start_date": tp_data['start_date'].get('value'),
        "end_date": tp_data['end_date'].get('value'),
        "extraction_confidence": _calculate_average_confidence(tp_data),
        "extraction_method": "tp_rule_based",
        "performance_remark": tp_data.get('performance_remark', {}).get('value', ""),
        "metadata": {
            "apaar_id": tp_data['apaar_id'].get('value'),
            "cert_id": tp_data['cert_id'].get('value'),
            "gst": tp_data['gst'].get('value'),
            "cin": tp_data['cin'].get('value'),
            "signatory_name": tp_data['signatory_name'].get('value'),
            "signatory_email": tp_data['signatory_email'].get('value')
        }
    }
    
    # Calculate duration in months if not present
    if result["total_hours"]:
        result["duration_in_months"] = result["total_hours"] // 160 or 1
    elif result["start_date"] and result["end_date"]:
        result["duration_in_months"] = _calculate_months(result["start_date"], result["end_date"])
    
    return result

def _safe_int(val):
    try:
        if not val: return None
        return int(val)
    except:
        return None

def _calculate_average_confidence(tp_data):
    confs = [v.get('conf', 0.0) for v in tp_data.values() if isinstance(v, dict)]
    if not confs: return 0.0
    return round(sum(confs) / len(confs), 2)

def _calculate_months(start_str, end_str):
    try:
        start = datetime.strptime(start_str, '%Y-%m-%d')
        end = datetime.strptime(end_str, '%Y-%m-%d')
        diff = end - start
        return max(1, diff.days // 30)
    except:
        return None
