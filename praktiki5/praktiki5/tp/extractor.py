
import re
from datetime import datetime
from typing import Dict, Any
import pytesseract
from PIL import Image
import pdfplumber
from pdf2image import convert_from_path
from docx import Document
import spacy

# ==========================
# Lazy-load spaCy (VERY IMPORTANT)
# ==========================
_nlp = None

def get_nlp():
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
        except:
            _nlp = None
    return _nlp


# ==========================
# Field Extractor
# ==========================
class FieldExtractor:

    def __init__(self):
        self.nlp = get_nlp()

        self.patterns = {
            'apaar_id': r'APAAR[-_]?([A-Z0-9-]{8,})',
            'cert_id': r'(?:Certificate|Cert)\s*(?:ID|No|Number)?\s*:?\s*([A-Z0-9-]{6,})',
            'gst': r'\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b',
            'cin': r'\b([LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6})\b',
            'hours': r'(\d+)\s*(?:hours?|hrs?)',
            'institution_code': r'(?:Institution|College|University)\s*Code\s*:?\s*([A-Z0-9-]{4,})',
            'email': r'\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b',
        }

        self.date_patterns = [
            r'(\d{1,2}[/-]\d{1,2}[/-]\d{4})',
            r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})',
            r'((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4})',
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

        # spaCy ONLY if text is small
        if self.nlp and len(text) < 8000:
            doc = self.nlp(text)
            result['name'] = self._extract_person(doc)
            result['organization'] = self._extract_org(doc)
            result['signatory_name'] = self._extract_signatory(doc)
        else:
            result['name'] = {'value': '', 'conf': 0.0}
            result['organization'] = {'value': '', 'conf': 0.0}
            result['signatory_name'] = {'value': '', 'conf': 0.0}

        result['signatory_email'] = self._extract_pattern(text, 'email')
        result['internship_title'] = self._extract_title(text)

        return result

    # ==========================
    # FILE HANDLING
    # ==========================
    def extract_from_file(self, file_path: str) -> Dict[str, Any]:
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
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs)

    def _read_pdf(self, path):
        text = ""
        try:
            with pdfplumber.open(path) as pdf:
                for page in pdf.pages[:2]:
                    t = page.extract_text()
                    if t:
                        text += t + "\n"
        except:
            pass

        # OCR ONLY first page if needed
        if not text.strip():
            try:
                images = convert_from_path(path, first_page=1, last_page=1)
                text = pytesseract.image_to_string(images[0])
            except:
                pass

        return text

    def _read_image(self, path):
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
        nums = re.findall(self.patterns['hours'], text, re.I)
        if nums:
            return {'value': max(nums), 'conf': 0.8}
        return {'value': '', 'conf': 0.0}

    def _extract_dates(self, text):
        found = []
        for pat in self.date_patterns:
            for d in re.findall(pat, text):
                n = self._normalize_date(d)
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
        fmts = ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%b %d, %Y', '%B %d, %Y']
        for f in fmts:
            try:
                return datetime.strptime(s.strip(), f).strftime('%Y-%m-%d')
            except:
                pass
        return ""

    def _extract_person(self, doc):
        people = [e.text for e in doc.ents if e.label_ == 'PERSON']
        return {'value': people[0], 'conf': 0.75} if people else {'value': '', 'conf': 0.0}

    def _extract_org(self, doc):
        orgs = [e.text for e in doc.ents if e.label_ == 'ORG']
        return {'value': orgs[0], 'conf': 0.75} if orgs else {'value': '', 'conf': 0.0}

    def _extract_signatory(self, doc):
        people = [e.text for e in doc.ents if e.label_ == 'PERSON']
        return {'value': people[-1], 'conf': 0.7} if people else {'value': '', 'conf': 0.0}

    def _extract_title(self, text):
        m = re.search(r'internship\s+(?:in|as)\s+([A-Za-z\s]{4,30})', text, re.I)
        return {'value': m.group(1).strip(), 'conf': 0.7} if m else {'value': '', 'conf': 0.0}

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
    return FieldExtractor().extract_from_text(text)

def extract_from_file(path):
    return FieldExtractor().extract_from_file(path)
