"""
LLM-Based Resume Parser  (Industry-Grade)
==========================================

This module replaces regex/NER-based parsing with LLM-powered structured
extraction. It works with ANY resume format because it relies on the LLM's
contextual understanding rather than pattern matching.

Architecture:
  1. PDF  →  clean text  (pdfplumber with CID cleanup)
  2. Text →  LLM prompt  (structured JSON extraction via function calling)
  3. LLM  →  validated Pydantic models

Supports: OpenAI (GPT-4o-mini/GPT-4o), Google Gemini, or local Ollama.

Why this is better than regex:
  - Handles ANY resume layout (single column, two-column, creative, etc.)
  - Understands context ("Intern at Google" vs "Google Maps project")
  - Handles abbreviations ("Sr. SDE" → "Senior Software Development Engineer")
  - No hardcoded section names needed
  - Gracefully handles messy text, CID artifacts, merged lines
"""

import json
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# --------------------------------------------------------------------------
# LLM Provider abstraction
# --------------------------------------------------------------------------

# The structured extraction prompt — this is the "secret sauce"
EXTRACTION_PROMPT = """You are an expert resume parser. Extract ALL structured information from the resume text below.

CRITICAL RULES:
1. Extract EVERYTHING you can find — do not skip any section.
2. If a field is not present in the resume, use null (not empty string).
3. For phone numbers, extract ONLY the digits. Remove country codes, brackets, dashes. Return exactly 10 digits for Indian numbers.
4. For skills, extract individual skill names, not categories. "Python, React, Node.js" → ["Python", "React", "Node.js"]
5. For experience, extract EACH role as a separate entry with all bullet points as the description.
6. For education, extract degree, institution, dates, GPA/CGPA, and field of study.
7. For projects, extract title, tech stack, and full description from bullet points.
8. For certifications/accomplishments, extract name, issuer/organization, and dates.
9. Ignore PDF artifacts like (cid:NNN), icon characters, and formatting noise.
10. For dates, use the format as written in the resume (e.g., "Nov 2024 – Sep 2025").

Return a JSON object with EXACTLY this structure (no markdown, no code fences, just pure JSON):
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "1234567890",
  "location": "City, State/Country",
  "linkedin": "linkedin URL or null",
  "github": "github URL or null",
  "summary": "Professional summary/objective if present, else null",
  "skills": {
    "languages": ["Python", "JavaScript"],
    "frameworks": ["React", "Node.js"],
    "tools": ["Docker", "Git"],
    "databases": ["PostgreSQL", "MongoDB"],
    "other": ["Machine Learning", "DevOps"]
  },
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "location": "City, State",
      "start_date": "Nov 2024",
      "end_date": "Sep 2025",
      "description": "Full description with all bullet points merged"
    }
  ],
  "education": [
    {
      "institution": "University Name",
      "degree": "Bachelor of Science",
      "field_of_study": "Computer Science",
      "start_date": "Aug 2023",
      "end_date": "Jul 2027",
      "gpa": "8.5/10 or null",
      "coursework": ["Data Structures", "Operating Systems"]
    }
  ],
  "projects": [
    {
      "title": "Project Name",
      "technologies": ["React", "Node.js"],
      "start_date": "Sep 2025 or null",
      "description": "Full description with all bullet points merged"
    }
  ],
  "certifications": [
    {
      "name": "Certification or Accomplishment Name",
      "issuer": "Issuing Organization",
      "date": "Mar 2023 – May 2024 or null",
      "description": "Brief description if available"
    }
  ]
}

RESUME TEXT:
"""


class LLMParserError(Exception):
    """Raised when LLM parsing fails."""
    pass


async def parse_with_openai(text: str, api_key: str, model: str = "gpt-4o-mini") -> Dict[str, Any]:
    """Parse resume text using OpenAI API with structured output."""
    try:
        from openai import AsyncOpenAI
    except ImportError:
        raise LLMParserError("openai package not installed. Run: pip install openai")

    client = AsyncOpenAI(api_key=api_key)

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise resume parser. Return ONLY valid JSON, no markdown fences."
                },
                {
                    "role": "user",
                    "content": EXTRACTION_PROMPT + text
                }
            ],
            temperature=0.0,  # Deterministic output
            max_tokens=4000,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        if not content:
            raise LLMParserError("OpenAI returned empty response")

        return json.loads(content)

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse OpenAI JSON response: {e}")
        raise LLMParserError(f"Invalid JSON from OpenAI: {e}")
    except Exception as e:
        logger.error(f"OpenAI API error: {e}")
        raise LLMParserError(f"OpenAI API error: {e}")


async def parse_with_gemini(text: str, api_key: str, model: str = "gemini-2.0-flash") -> Dict[str, Any]:
    """Parse resume text using Google Gemini API."""
    try:
        import google.generativeai as genai
    except ImportError:
        raise LLMParserError("google-generativeai package not installed. Run: pip install google-generativeai")

    import asyncio
    import functools

    genai.configure(api_key=api_key)
    gen_model = genai.GenerativeModel(model)

    def _sync_generate():
        """Run sync Gemini call (will be run in thread pool)."""
        return gen_model.generate_content(
            EXTRACTION_PROMPT + text,
            generation_config=genai.GenerationConfig(
                temperature=0.0,
                response_mime_type="application/json",
            ),
        )

    try:
        # Run sync Gemini SDK in a thread pool to avoid blocking the event loop
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(None, _sync_generate)

        content = response.text
        if not content:
            raise LLMParserError("Gemini returned empty response")

        # Gemini sometimes wraps JSON in ```json ... ```
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[1]  # Remove first line
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()

        return json.loads(content)

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse Gemini JSON response: {e}")
        raise LLMParserError(f"Invalid JSON from Gemini: {e}")
    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        raise LLMParserError(f"Gemini API error: {e}")


async def parse_with_ollama(text: str, model: str = "llama3.1", base_url: str = "http://localhost:11434") -> Dict[str, Any]:
    """Parse resume text using local Ollama instance (free, no API key needed)."""
    try:
        import httpx
    except ImportError:
        raise LLMParserError("httpx package not installed. Run: pip install httpx")

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{base_url}/api/generate",
                json={
                    "model": model,
                    "prompt": EXTRACTION_PROMPT + text,
                    "stream": False,
                    "format": "json",
                    "options": {
                        "temperature": 0.0,
                        "num_predict": 4000,
                    }
                }
            )
            response.raise_for_status()
            result = response.json()
            content = result.get("response", "")
            if not content:
                raise LLMParserError("Ollama returned empty response")
            return json.loads(content)

    except json.JSONDecodeError as e:
        raise LLMParserError(f"Invalid JSON from Ollama: {e}")
    except Exception as e:
        raise LLMParserError(f"Ollama error: {e}")


# --------------------------------------------------------------------------
# Unified LLM parser
# --------------------------------------------------------------------------

async def llm_parse_resume(
    text: str,
    provider: str = "auto",
) -> Dict[str, Any]:
    """
    Parse resume text using the best available LLM provider.

    Provider priority (auto mode):
      1. OpenAI  (if OPENAI_API_KEY is set)
      2. Gemini  (if GEMINI_API_KEY or GOOGLE_API_KEY is set)
      3. Ollama  (if running locally — free, no API key)
      4. Fallback to None (caller should use traditional parser)

    Args:
        text: Cleaned resume text
        provider: "openai", "gemini", "ollama", or "auto"

    Returns:
        Structured resume data dict
    """
    openai_key = os.getenv("OPENAI_API_KEY", "")
    gemini_key = os.getenv("GEMINI_API_KEY", "") or os.getenv("GOOGLE_API_KEY", "")

    if provider == "auto":
        if openai_key:
            provider = "openai"
        elif gemini_key:
            provider = "gemini"
        else:
            # Try Ollama as free fallback
            provider = "ollama"

    logger.info(f"Using LLM provider: {provider}")

    if provider == "openai":
        if not openai_key:
            raise LLMParserError("OPENAI_API_KEY not set")
        return await parse_with_openai(text, openai_key)

    elif provider == "gemini":
        if not gemini_key:
            raise LLMParserError("GEMINI_API_KEY not set")
        return await parse_with_gemini(text, gemini_key)

    elif provider == "ollama":
        return await parse_with_ollama(text)

    else:
        raise LLMParserError(f"Unknown LLM provider: {provider}")


# --------------------------------------------------------------------------
# Normalize LLM output to match existing schema
# --------------------------------------------------------------------------

def normalize_llm_output(llm_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform the LLM's structured output into the format expected by
    the existing ResumeData schema and the frontend prefill system.

    This is the bridge between "LLM understands anything" and
    "our existing code expects a specific format."
    """
    # Flatten skills from categorized to flat list
    skills_data = llm_data.get("skills", {})
    all_skills: List[str] = []
    if isinstance(skills_data, dict):
        for category in skills_data.values():
            if isinstance(category, list):
                all_skills.extend(str(s) for s in category)
    elif isinstance(skills_data, list):
        all_skills = [str(s) for s in skills_data]

    # Deduplicate while preserving order
    seen = set()
    unique_skills = []
    for s in all_skills:
        if s.lower() not in seen:
            seen.add(s.lower())
            unique_skills.append(s)

    # Normalize experience
    experience = []
    for exp in llm_data.get("experience", []):
        if not isinstance(exp, dict):
            continue
        duration = ""
        start = exp.get("start_date", "")
        end = exp.get("end_date", "")
        if start and end:
            duration = f"{start} – {end}"
        elif start:
            duration = f"{start} – Present"

        experience.append({
            "company": exp.get("company"),
            "position": exp.get("position"),
            "duration": duration,
            "description": exp.get("description"),
            "location": exp.get("location"),
        })

    # Normalize education
    education = []
    for edu in llm_data.get("education", []):
        if not isinstance(edu, dict):
            continue
        year = ""
        start = edu.get("start_date", "")
        end = edu.get("end_date", "")
        if start and end:
            year = f"{start} – {end}"
        elif end:
            year = end

        education.append({
            "degree": edu.get("degree"),
            "institution": edu.get("institution"),
            "year": year,
            "gpa": edu.get("gpa"),
            "field_of_study": edu.get("field_of_study"),
            "start_year": _extract_year(start),
            "end_year": _extract_year(end),
            "coursework": edu.get("coursework", []),
        })

    # Normalize projects
    projects = []
    for proj in llm_data.get("projects", []):
        if not isinstance(proj, dict):
            continue
        projects.append({
            "title": proj.get("title"),
            "description": proj.get("description"),
            "technologies": proj.get("technologies", []),
            "url": proj.get("url"),
        })

    # Normalize certifications
    certifications = []
    for cert in llm_data.get("certifications", []):
        if not isinstance(cert, dict):
            continue
        certifications.append({
            "name": cert.get("name"),
            "issuer": cert.get("issuer"),
            "date": cert.get("date"),
            "description": cert.get("description"),
        })

    # Build final normalized output
    name = llm_data.get("name", "")
    first_name, last_name = _split_name(name)

    # Clean phone
    phone = llm_data.get("phone", "") or ""
    phone_digits = ''.join(c for c in phone if c.isdigit())
    if len(phone_digits) > 10:
        phone_digits = phone_digits[-10:]  # Take last 10 digits

    return {
        "name": name,
        "first_name": first_name,
        "last_name": last_name,
        "email": llm_data.get("email"),
        "phone": phone_digits,
        "phone_number": phone_digits,
        "location": llm_data.get("location"),
        "linkedin": llm_data.get("linkedin"),
        "github": llm_data.get("github"),
        "summary": llm_data.get("summary"),
        "skills": unique_skills,
        "skills_categorized": skills_data if isinstance(skills_data, dict) else None,
        "experience": experience,
        "education": education,
        "education_entries": education,
        "projects": projects,
        "certifications": certifications,
        "total_experience_years": _estimate_experience_years(experience),
        "detected_stacks": [],
    }


def _split_name(full_name: str) -> tuple:
    """Split full name into first and last name."""
    if not full_name:
        return ("", "")
    parts = full_name.strip().split()
    if len(parts) == 1:
        return (parts[0], "")
    return (parts[0], " ".join(parts[1:]))


def _extract_year(date_str: str) -> str:
    """Extract 4-digit year from a date string."""
    if not date_str:
        return ""
    import re
    match = re.search(r'((?:19|20)\d{2})', str(date_str))
    return match.group(1) if match else ""


def _estimate_experience_years(experience: List[Dict]) -> float:
    """Estimate total years of experience from duration strings."""
    import re
    total = 0.0
    for exp in experience:
        duration = exp.get("duration", "")
        if not duration:
            continue
        years = re.findall(r'((?:19|20)\d{2})', duration)
        if len(years) >= 2:
            total += int(years[-1]) - int(years[0])
        elif len(years) == 1 and any(word in duration.lower() for word in ["present", "current", "now"]):
            total += 2026 - int(years[0])
    return total
