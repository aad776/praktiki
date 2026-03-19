import re
from datetime import datetime
from typing import Dict, Any
import pytesseract
from PIL import Image
import pdfplumber
from pdf2image import convert_from_path
from docx import Document
import spacy
import os

# Set Tesseract path for Windows
tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
if os.path.exists(tesseract_path):
    pytesseract.pytesseract.tesseract_cmd = tesseract_path

# ==========================
# Lazy-load spaCy (VERY IMPORTANT)
# ==========================
_nlp = None

def get_nlp():
    global _nlp
    if _nlp is None:
        try:
            # Try to load the model, handle cases where it might not be downloaded
            _nlp = spacy.load("en_core_web_sm")
        except Exception as e:
            print(f"spaCy load error: {e}")
            _nlp = None
    return _nlp


# ==========================
# Field Extractor (Logic from tp/extractor.py + PERFECTION UPGRADES)
# ==========================
class TPExtractor:

    def __init__(self):
        self.nlp = get_nlp()

        self.patterns = {
            'apaar_id': r'APAAR[-_]?([A-Z0-9-]{8,})',
            'cert_id': r'(?:Certificate|Cert)\s*(?:ID|No|Number)?\s*:?\s*([A-Z0-9-]{6,})',
            'gst': r'\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b',
            'cin': r'\b([LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6})\b',
            'hours': r'(\d+)\s*(?:hours?|hrs?|duration|total)',
            'institution_code': r'(?:Institution|College|University)\s*Code\s*:?\s*([A-Z0-9-]{4,})',
            'email': r'\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b',
        }

        self.date_patterns = [
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            r'(\d{2,4}[/-]\d{1,2}[/-]\d{1,2})',
            r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})',
            r'(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{2,4})',
        ]

    # ==========================
    # MAIN TEXT EXTRACTION
    # ==========================
    def extract_from_text(self, text: str) -> Dict[str, Any]:
        if not text or not text.strip():
            return self._empty_result()

        result = {}

        for key in ['apaar_id', 'cert_id', 'gst', 'cin', 'institution_code']:
            result[key] = self._extract_pattern(text, key)

        result['hours'] = self._extract_hours(text)

        dates = self._extract_dates(text)
        result['start_date'] = dates['start']
        result['end_date'] = dates['end']

        # Prioritize Rule-based Fallback for Name and Organization on Certificates
        result['name'] = self._extract_person_fallback(text)
        result['organization'] = self._extract_org_fallback(text)
        
        # If fallback fails, try spaCy
        if self.nlp and (not result['name']['value'] or not result['organization']['value']):
            doc = self.nlp(text)
            if not result['name']['value']:
                result['name'] = self._extract_person(doc)
            if not result['organization']['value']:
                result['organization'] = self._extract_org(doc)
            result['signatory_name'] = self._extract_signatory(doc)
        else:
            result['signatory_name'] = {'value': '', 'conf': 0.0}

        result['signatory_email'] = self._extract_pattern(text, 'email')
        result['internship_title'] = self._extract_title(text)

        return result

    # ==========================
    # FILE HANDLING
    # ==========================
    def extract_from_file(self, file_path: str) -> Dict[str, Any]:
        if not os.path.exists(file_path):
            return self._empty_result()
            
        path = file_path.lower()

        try:
            if path.endswith('.docx'):
                return self.extract_from_text(self._read_docx(file_path))

            if path.endswith('.pdf'):
                return self.extract_from_text(self._read_pdf(file_path))

            if path.endswith(('.png', '.jpg', '.jpeg')):
                return self.extract_from_text(self._read_image(file_path))

            if path.endswith('.txt'):
                with open(file_path, encoding='utf-8') as f:
                    return self.extract_from_text(f.read())

        except Exception as e:
            print("Extractor error:", e)

        return self._empty_result()

    # ==========================
    # READERS (SAFE)
    # ==========================
    def _read_docx(self, path):
        try:
            doc = Document(path)
            return "\n".join(p.text for p in doc.paragraphs)
        except Exception as e:
            print(f"Docx read error: {e}")
            return ""

    def _read_pdf(self, path):
        text = ""
        try:
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages[:2]:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
        except Exception as e:
            print(f"Pdfplumber error: {e}")
            pass

        # OCR ONLY first page if needed
        if not text.strip():
            try:
                images = convert_from_path(path, first_page=1, last_page=1)
                text = pytesseract.image_to_string(images[0])
            except Exception as e:
                print(f"PDF OCR error: {e}")
                pass

        return text

    def _read_image(self, path):
        try:
            # Avoid circular import
            from .ocr import extract_text
            return extract_text(path)
        except Exception as e:
            print(f"Image OCR error: {e}")
            try:
                return pytesseract.image_to_string(Image.open(path))
            except:
                return ""

    # ==========================
    # HELPERS
    # ==========================
    def _extract_pattern(self, text, key):
        pat = self.patterns.get(key)
        if not pat:
            return {'value': '', 'conf': 0.0}

        m = re.search(pat, text, re.I)
        if m:
            return {'value': m.group(1), 'conf': 0.85}
        return {'value': '', 'conf': 0.0}

    def _extract_hours(self, text):
        # PERFECTION UPGRADE: If no hours mentioned, check for months and convert
        nums = re.findall(r'(\d+)\s*(?:hours?|hrs?)', text, re.I)
        if nums:
            return {'value': max(nums), 'conf': 0.9}
            
        # Check for months (e.g., "2 Months", "2M nths")
        month_match = re.search(r'(\d+)\s*[Mm]?\s*(?:onth|o|nths)s?', text, re.I)
        if month_match:
            months = int(month_match.group(1))
            return {'value': str(months * 160), 'conf': 0.8}
        
        # 'one month' case
        if re.search(r'(?:one|1)\s*(?:month|mo|nths)', text, re.I):
            return {'value': '160', 'conf': 0.8}
            
        return {'value': '', 'conf': 0.0}

    def _extract_dates(self, text):
        found = []
        for pat in self.date_patterns:
            for d in re.findall(pat, text):
                n = self._normalize_date(d)
                if n:
                    found.append(n)

        # Additional check for DD.MM.YYYY
        dot_dates = re.findall(r'(\d{1,2}\.\d{1,2}\.\d{4})', text)
        for d in dot_dates:
            n = self._normalize_date(d.replace('.', '-'))
            if n:
                found.append(n)

        if len(found) >= 2:
            return {
                'start': {'value': found[0], 'conf': 0.8},
                'end': {'value': found[1], 'conf': 0.8}
            }
        if len(found) == 1:
            return {
                'start': {'value': found[0], 'conf': 0.7},
                'end': {'value': '', 'conf': 0.0}
            }
        return {'start': {'value': '', 'conf': 0.0}, 'end': {'value': '', 'conf': 0.0}}

    def _normalize_date(self, s):
        fmts = ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%b %d, %Y', '%B %d, %Y', '%d %b %Y', '%d %B %Y', '%d.%m.%Y']
        for f in fmts:
            try:
                return datetime.strptime(s.strip(), f).strftime('%Y-%m-%d')
            except:
                pass
        return ""

    def _extract_person(self, doc):
        # 1. Try spaCy NER
        people = [e.text for e in doc.ents if e.label_ == 'PERSON']
        if people:
            return {'value': people[0].strip(), 'conf': 0.75}
            
        # 2. PERFECTION UPGRADE: Fallback to regex patterns
        return self._extract_person_fallback(doc.text)

    def _extract_person_fallback(self, text):
        # Improved name patterns for varying certificate language
        name_patterns = [
            r'(?:certify that|presented to|awarded to|is given to|this is to certify that|recognizes|congratulations|hereby certifies that)\s*\n*\s*([A-Z][a-z\s]{2,}(?:\s+[A-Z][a-z\s]{2,})+)',
            r'([A-Z][a-z\s]{2,}(?:\s+[A-Z][a-z\s]{2,})+)\s*\n*\s*(?:has successfully|has completed|completed|is hereby)',
            r'(?:student name|name of student|this is to certify that Mr\.|this is to certify that Ms\.|this is to certify that Mrs\.)[:\s-]*([A-Z][a-z\s]{2,}(?:\s+[A-Z][a-z\s]{2,})+)',
            r'(?:Awarded to|Presented to|Certificate of Excellence to)\s*\n*\s*([A-Z][a-z\s]{2,}(?:\s+[A-Z][a-z\s]{2,})+)',
        ]
        for pat in name_patterns:
            m = re.search(pat, text, re.I)
            if m:
                name = m.group(1).split('\n')[0].strip()
                # Remove common OCR noise at the end of name
                name = re.sub(r'[^a-zA-Z\s].*$', '', name).strip()
                if len(name.split()) >= 2 and len(name.split()) <= 6:
                    return {'value': name, 'conf': 0.85}
        return {'value': '', 'conf': 0.0}

    def _extract_org(self, doc):
        # 1. Try spaCy NER
        orgs = [e.text for e in doc.ents if e.label_ == 'ORG']
        if orgs:
            # Filter out common false positives
            filtered = [o for o in orgs if len(o) > 3 and not any(w in o.upper() for w in ["CERTIFICATE", "INTERNSHIP", "DURATION", "COMPLETION"])]
            if filtered:
                # Prioritize organizations that look like company names
                for o in filtered:
                    if any(w in o.upper() for w in ["PVT", "LTD", "LIMITED", "INC", "CORP", "SOLUTIONS", "TECH"]):
                        return {'value': o.strip(), 'conf': 0.9}
                return {'value': filtered[0].strip(), 'conf': 0.8}
            
        # 2. PERFECTION UPGRADE: Fallback to keywords
        return self._extract_org_fallback(doc.text)

    def _extract_org_fallback(self, text):
        # Improved organization patterns for diverse fonts and artifacts
        org_patterns = [
            r'(?:Organization|Company|Institution|Employer|For|At|Issued by|Provider)[:\s,]+([A-Z][a-zA-Z&\s\(\)\-\.]{3,}(?:Inc\.|Ltd\.|LLC|Corp\.|School|Academy|Foundation|NGO|Trust|University|Solutions|Private|Limited|Pvt\.|Institute|Center|Centre))',
            r'([A-Z][a-zA-Z&\s\-]{3,}(?:Pvt\.|Ltd\.|Limited|Inc\.|Corp\.|Solutions|Technologies|Institute|Academy|University))\s+(?:certifies that|presents this|certify that|confers|recognizes|hereby certifies)',
            r'(?:by|from|at|For|under)\s+([A-Z][a-zA-Z&\s\(\)\-]{3,}(?:Inc\.|Ltd\.|LLC|Corp\.|School|Academy|Foundation|NGO|Trust|University|Center|Centre|Institute|Solutions))'
        ]
        
        common_words = ["We", "The", "This", "To", "For", "By", "At", "From", "He", "She", "It", "They", "During", "Certificate", "This is"]
        
        # Heuristic: First few lines check (Higher priority for certificate headers)
        lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
        for line in lines[:8]:
            # Clean up the line from common OCR artifacts like '|', '.', etc.
            clean_line = re.sub(r'^[^a-zA-Z0-9]+|[^a-zA-Z0-9\s\-\.]+$', '', line).strip()
            if any(kw in clean_line.upper() for kw in ["SCHOOL", "TRUST", "INSTITUTE", "UNIVERSITY", "LIMITED", "LTD", "INC", "FOUNDATION", "CORPORATION", "ACADEMY", "SOLUTIONS", "TECHNOLOGIES"]):
                if len(clean_line) > 3 and not any(w in clean_line.upper() for w in ["CERTIFICATE", "TO WHOM"]):
                    return {'value': clean_line, 'conf': 0.9}

        for pat in org_patterns:
            m = re.search(pat, text, re.I)
            if m:
                val = m.group(1).strip()
                # Remove trailing non-alphabetic noise
                val = re.sub(r'[^a-zA-Z\s\(\)\.]$', '', val).strip()
                if val.split()[0] not in common_words:
                    return {'value': val, 'conf': 0.8}
                
        if lines and len(lines[0]) > 3 and len(lines[0]) < 60 and not any(w in lines[0].upper() for w in ["CERTIFICATE", "TO WHOM"]):
            return {'value': lines[0].strip(), 'conf': 0.6}
        return {'value': '', 'conf': 0.0}

    def _extract_signatory(self, doc):
        people = [e.text for e in doc.ents if e.label_ == 'PERSON']
        # Signatories are usually at the end of the certificate
        if people:
            last_person = people[-1].strip()
            if len(last_person.split()) >= 2:
                return {'value': last_person, 'conf': 0.75}
        return {'value': '', 'conf': 0.0}

    def _extract_title(self, text):
        # PERFECTION UPGRADE: Cleaner regex
        title_patterns = [
            r'internship\s+(?:in|as|position of|with us as a|under the role of)\s*\n*\s*([A-Za-z\-\s]{4,50})',
            r'(?:Role|Title|Position)[:\s-]*([A-Za-z\-\s]{4,50})',
            r'([A-Z][a-z\s\-]+(?:Intern|Trainee|Assistant|Developer|Designer|Analyst|Program|Writer|Executive|Manager|Coordinator))'
        ]
        
        for pat in title_patterns:
            m = re.search(pat, text, re.I)
            if m:
                title = m.group(1).split('\n')[0].strip()
                # Clean up title
                title = re.sub(r'(?:has|successfully|completed|during|for).*$', '', title, flags=re.I).strip()
                if len(title) > 3:
                    return {'value': title, 'conf': 0.85}
            
        return {'value': '', 'conf': 0.0}

    def _empty_result(self):
        return {k: {'value': '', 'conf': 0.0} for k in [
            'name','apaar_id','institution_code','organization',
            'internship_title','start_date','end_date','hours',
            'cert_id','signatory_name','signatory_email','gst','cin'
        ]}


# ==========================
# SIMPLE API FUNCTIONS
# ==========================
def extract_from_text(text):
    return TPExtractor().extract_from_text(text)

def extract_from_file(path):
    return TPExtractor().extract_from_file(path)
