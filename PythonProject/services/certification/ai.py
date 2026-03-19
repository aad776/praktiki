
import os
import json
from openai import OpenAI
from typing import Dict, Any

# Ensure OpenAI API key is set
api_key = os.getenv("OPENAI_API_KEY")

def extract_info(text: str) -> Dict[str, Any]:
    """
    Extract certificate details using OpenAI GPT-3.5 or GPT-4.
    Formats the output to match the system's expected structure.
    """
    if not api_key:
        return {"error": "No OpenAI API Key found"}
        
    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": """
                You are a certificate parsing expert. Extract data from the provided text and return it in a SPECIFIC NESTED JSON format.
                
                Required JSON Structure:
                {
                  "name": {"value": "Full Name", "conf": 0.95},
                  "organization": {"value": "Company Name", "conf": 0.95},
                  "internship_title": {"value": "Role", "conf": 0.9},
                  "hours": {"value": "160", "conf": 0.85},
                  "start_date": {"value": "YYYY-MM-DD", "conf": 0.8},
                  "end_date": {"value": "YYYY-MM-DD", "conf": 0.8},
                  "apaar_id": {"value": "", "conf": 0.0},
                  "cert_id": {"value": "", "conf": 0.0},
                  "signatory_name": {"value": "", "conf": 0.0},
                  "signatory_email": {"value": "", "conf": 0.0},
                  "gst": {"value": "", "conf": 0.0},
                  "cin": {"value": "", "conf": 0.0},
                  "institution_code": {"value": "", "conf": 0.0},
                  "performance_remark": {"value": "Excellent", "conf": 0.9}
                }
                
                Rules:
                1. If a field is missing, use empty string for value and 0.0 for conf.
                2. Normalize dates to YYYY-MM-DD.
                3. If 'hours' is not mentioned but duration is '1 month', use '160'.
                4. Infer 'internship_title' if not explicit (e.g. 'Web Development Intern').
                """},
                {"role": "user", "content": text}
            ],
            response_format={"type": "json_object"}
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"AI Extraction Error: {e}")
        return {}
