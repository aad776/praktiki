
import os
import json
from app.services.tp_extractor import extract_from_text

# Let's simulate the text from Ashish Panwar's certificate (extracted manually)
ASHISH_CERT_TEXT = """
Pehchaan
THE STREET SCHOOL
(PEHCHAAN)
This is to certify that
ASHISH PANWAR
has successfully completed 1 month internship
as a Web Development Intern
Performance: Excellent
Date: 20-05-2024
"""

def test_perfection():
    print("--- TP FOLDER EXTRACTION LOGIC TEST ---")
    print(f"Simulating extraction for text: \n{ASHISH_CERT_TEXT}")
    
    # Use the exact logic from tp folder (which I ported to tp_extractor.py)
    result = extract_from_text(ASHISH_CERT_TEXT)
    
    print("\n--- FINAL JSON OUTPUT (AS PER TP LOGIC) ---")
    print(json.dumps(result, indent=2))
    
    # Check key fields for perfection
    print("\n--- PERFECTION CHECK ---")
    print(f"Name: {result['name']['value']} (Conf: {result['name']['conf']})")
    print(f"Org: {result['organization']['value']} (Conf: {result['organization']['conf']})")
    print(f"Title: {result['internship_title']['value']} (Conf: {result['internship_title']['conf']})")
    print(f"Duration: {result['hours']['value']} Hours (Infer: 1 Month)")

if __name__ == "__main__":
    test_perfection()
