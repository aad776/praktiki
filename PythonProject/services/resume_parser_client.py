"""
Resume parser service client.

This module keeps the backend decoupled from parser internals:
- Backend uploads resume to an external parser service
- Backend normalizes parser output into UI-friendly profile prefill fields
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Tuple

import httpx

from utils.settings import settings


class ResumeParserServiceError(Exception):
    """Raised when parser service call fails or returns unusable payload."""

    def __init__(self, message: str, status_code: int = 503) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


def _safe_str(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _split_full_name(full_name: str) -> Tuple[str, str]:
    cleaned = _safe_str(full_name)
    if not cleaned:
        return "", ""
    parts = cleaned.split()
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _parse_year_range(raw_year: str) -> Tuple[str, str]:
    years = re.findall(r"(?:19|20)\d{2}", _safe_str(raw_year))
    if len(years) >= 2:
        return years[0], years[-1]
    if len(years) == 1:
        return "", years[0]
    return "", ""


def _normalize_skills(raw_skills: Any) -> List[str]:
    if not isinstance(raw_skills, list):
        return []

    seen = set()
    normalized: List[str] = []
    for skill in raw_skills:
        name = _safe_str(skill)
        if not name:
            continue
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(name)
    return normalized


def _normalize_experience(raw_experience: Any) -> List[Dict[str, str]]:
    if not isinstance(raw_experience, list):
        return []

    normalized: List[Dict[str, str]] = []
    for entry in raw_experience:
        if not isinstance(entry, dict):
            continue
        normalized.append(
            {
                "company": _safe_str(entry.get("company") or entry.get("organization")),
                "position": _safe_str(entry.get("position") or entry.get("role")),
                "duration": _safe_str(entry.get("duration")),
                "description": _safe_str(entry.get("description")),
            }
        )
    return normalized


def _normalize_education(raw_education: Any) -> List[Dict[str, str]]:
    if not isinstance(raw_education, list):
        return []

    normalized: List[Dict[str, str]] = []
    for entry in raw_education:
        if not isinstance(entry, dict):
            continue

        degree = _safe_str(entry.get("degree"))
        institution = _safe_str(entry.get("institution") or entry.get("university"))
        year = _safe_str(entry.get("year"))
        gpa = _safe_str(entry.get("gpa"))
        field_of_study = _safe_str(entry.get("field_of_study") or entry.get("specialization"))
        start_year, end_year = _parse_year_range(year)

        normalized.append(
            {
                "degree": degree,
                "institution": institution,
                "year": year,
                "gpa": gpa,
                "field_of_study": field_of_study,
                "start_year": start_year,
                "end_year": end_year,
            }
        )
    return normalized


def _normalize_projects(raw_projects: Any) -> List[Dict[str, Any]]:
    if not isinstance(raw_projects, list):
        return []

    normalized: List[Dict[str, Any]] = []
    for entry in raw_projects:
        if not isinstance(entry, dict):
            continue
        technologies = entry.get("technologies")
        normalized.append(
            {
                "title": _safe_str(entry.get("title")),
                "description": _safe_str(entry.get("description")),
                "technologies": technologies if isinstance(technologies, list) else [],
                "url": _safe_str(entry.get("url")),
            }
        )
    return normalized


def _normalize_certifications(raw_certs: Any) -> List[Dict[str, str]]:
    if not isinstance(raw_certs, list):
        return []

    normalized: List[Dict[str, str]] = []
    for entry in raw_certs:
        if not isinstance(entry, dict):
            continue
        normalized.append(
            {
                "name": _safe_str(entry.get("name")),
                "issuer": _safe_str(entry.get("issuer")),
                "date": _safe_str(entry.get("date")),
            }
        )
    return normalized


def _extract_service_error_message(payload: Any, fallback: str) -> str:
    if isinstance(payload, dict):
        detail = payload.get("detail")
        if isinstance(detail, str) and detail.strip():
            return detail.strip()
        error = payload.get("error")
        if isinstance(error, str) and error.strip():
            return error.strip()
    return fallback


def _build_prefill_payload(parsed_data: Dict[str, Any], current_user: Any) -> Dict[str, Any]:
    full_name = _safe_str(parsed_data.get("name")) or _safe_str(getattr(current_user, "full_name", ""))
    first_name, last_name = _split_full_name(full_name)

    education_entries = _normalize_education(parsed_data.get("education"))

    # Map LLM's "summary" → "career_objective" for the frontend
    career_objective = _safe_str(
        parsed_data.get("career_objective")
        or parsed_data.get("summary")
    )

    return {
        "first_name": first_name,
        "last_name": last_name,
        "email": _safe_str(parsed_data.get("email")) or _safe_str(getattr(current_user, "email", "")),
        "phone_number": _safe_str(parsed_data.get("phone")) or _safe_str(getattr(current_user, "phone_number", "")),
        "skills": _normalize_skills(parsed_data.get("skills")),
        "experience": _normalize_experience(parsed_data.get("experience")),
        "education_entries": education_entries,
        # Alias for consumers that still read `education`
        "education": education_entries,
        "projects": _normalize_projects(parsed_data.get("projects")),
        "certifications": _normalize_certifications(parsed_data.get("certifications")),
        "career_objective": career_objective,
        "linkedin": _safe_str(parsed_data.get("linkedin")),
        "github": _safe_str(parsed_data.get("github")),
        "detected_stacks": parsed_data.get("detected_stacks") if isinstance(parsed_data.get("detected_stacks"), list) else [],
        "total_experience_years": parsed_data.get("total_experience_years"),
        "confidence": parsed_data.get("confidence"),
        "raw_text_preview": _safe_str(parsed_data.get("raw_text"))[:500],
    }


async def parse_resume_via_service(
    *,
    file_name: str,
    file_content: bytes,
    content_type: str | None,
    current_user: Any,
) -> Dict[str, Any]:
    """
    Call external parser service and normalize output for profile prefill.
    """
    service_url = _safe_str(settings.PARSER_SERVICE_URL).rstrip("/")
    if not service_url:
        raise ResumeParserServiceError(
            "Resume parser service is not configured. Set PARSER_SERVICE_URL.",
            status_code=503,
        )

    endpoint = f"{service_url}/parse"
    timeout_seconds = float(settings.PARSER_SERVICE_TIMEOUT_SECONDS)
    headers: Dict[str, str] = {}
    if settings.PARSER_SERVICE_API_KEY:
        headers["X-API-Key"] = settings.PARSER_SERVICE_API_KEY

    try:
        async with httpx.AsyncClient(timeout=timeout_seconds) as client:
            response = await client.post(
                endpoint,
                files={
                    "file": (
                        file_name,
                        file_content,
                        content_type or "application/pdf",
                    )
                },
                headers=headers,
            )
    except httpx.TimeoutException as exc:
        raise ResumeParserServiceError(
            "Resume parser timed out. Please try again.",
            status_code=504,
        ) from exc
    except httpx.RequestError as exc:
        raise ResumeParserServiceError(
            "Resume parser service is unreachable.",
            status_code=503,
        ) from exc

    try:
        payload = response.json()
    except ValueError as exc:
        raise ResumeParserServiceError(
            "Resume parser returned invalid response format.",
            status_code=502,
        ) from exc

    if response.status_code >= 400:
        message = _extract_service_error_message(
            payload, f"Resume parser request failed with status {response.status_code}"
        )
        status_code = response.status_code if response.status_code < 500 else 502
        raise ResumeParserServiceError(message, status_code=status_code)

    if isinstance(payload, dict) and payload.get("success") is False:
        message = _extract_service_error_message(payload, "Resume parser could not parse this file.")
        raise ResumeParserServiceError(message, status_code=422)

    parsed_data = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(parsed_data, dict):
        raise ResumeParserServiceError(
            "Resume parser response missing parsed data.",
            status_code=502,
        )

    return {
        "success": True,
        "data": _build_prefill_payload(parsed_data, current_user),
    }
