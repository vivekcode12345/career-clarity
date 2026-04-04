import json
import os
import re

import requests
from dotenv import load_dotenv

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = "mistralai/mixtral-8x7b-instruct"


def _empty_roadmap_structure():
    return {
        "steps": [],
        "exams": [],
        "certifications": [],
        "skillRoadmap": [],
    }


def build_roadmap_prompt(ability, skills, career):
    skills_text = ", ".join(skills) if isinstance(skills, list) and skills else "None"

    return f"""
You are an expert career mentor. Generate a personalized career roadmap.

User Context:
- Career Goal: {career}
- Ability Level: {ability}
- Existing Skills: {skills_text}

Requirements:
1) Return ONLY valid JSON.
2) Generate 5 to 6 roadmap steps.
3) Each step must be an object with:
   - title
   - description (1-2 lines explaining WHY this step matters)
   - resources (2-3 items)
4) Each resource must include:
   - title
   - type (one of: video, docs, course, practice)
   - link (valid-looking URL, e.g., YouTube, Coursera, official docs)
5) Personalize depth based on ability and existing skills.
6) Keep exams, certifications, and skillRoadmap relevant to the chosen career.

Expected JSON shape:
{{
  "steps": [
    {{
      "title": "...",
      "description": "...",
      "resources": [
        {{"title": "...", "type": "video", "link": "https://..."}},
        {{"title": "...", "type": "docs", "link": "https://..."}}
      ]
    }}
  ],
  "exams": ["..."],
  "certifications": ["..."],
  "skillRoadmap": ["..."]
}}
""".strip()


def call_ai(prompt):
    if not OPENROUTER_API_KEY:
        return ""

    try:
        response = requests.post(
            OPENROUTER_URL,
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": OPENROUTER_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.4,
            },
            timeout=45,
        )
        response.raise_for_status()
        payload = response.json()
        return payload.get("choices", [{}])[0].get("message", {}).get("content", "")
    except Exception:
        return ""


def _extract_json_object(text):
    content = (text or "").strip()
    if not content:
        return {}

    try:
        parsed = json.loads(content)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        pass

    fenced_match = re.search(r"```(?:json)?\s*(\{[\s\S]*\})\s*```", content, re.IGNORECASE)
    if fenced_match:
        try:
            parsed = json.loads(fenced_match.group(1))
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}

    brace_match = re.search(r"(\{[\s\S]*\})", content)
    if brace_match:
        try:
            parsed = json.loads(brace_match.group(1))
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}

    return {}


def _normalize_step(step):
    if not isinstance(step, dict):
        return None

    title = step.get("title")
    description = step.get("description")
    resources = step.get("resources")

    if not isinstance(title, str) or not title.strip():
        return None
    if not isinstance(description, str) or not description.strip():
        return None
    if not isinstance(resources, list):
        return None

    normalized_resources = []
    for resource in resources:
        if not isinstance(resource, dict):
            continue

        resource_title = resource.get("title")
        resource_type = resource.get("type")
        resource_link = resource.get("link")

        if not (
            isinstance(resource_title, str)
            and resource_title.strip()
            and isinstance(resource_type, str)
            and resource_type.strip().lower() in {"video", "docs", "course", "practice"}
            and isinstance(resource_link, str)
            and resource_link.strip().startswith(("http://", "https://"))
        ):
            continue

        normalized_resources.append(
            {
                "title": resource_title.strip(),
                "type": resource_type.strip().lower(),
                "link": resource_link.strip(),
            }
        )

    if len(normalized_resources) < 2:
        return None

    return {
        "title": title.strip(),
        "description": description.strip(),
        "resources": normalized_resources[:3],
    }


def _validate_roadmap_payload(payload):
    if not isinstance(payload, dict):
        return _empty_roadmap_structure()

    if not {"steps", "exams", "certifications", "skillRoadmap"}.issubset(payload.keys()):
        return _empty_roadmap_structure()

    steps = payload.get("steps", [])
    exams = payload.get("exams", [])
    certifications = payload.get("certifications", [])
    skill_roadmap = payload.get("skillRoadmap", [])

    if not isinstance(steps, list):
        steps = []
    if not isinstance(exams, list):
        exams = []
    if not isinstance(certifications, list):
        certifications = []
    if not isinstance(skill_roadmap, list):
        skill_roadmap = []

    normalized_steps = []
    for step in steps:
        normalized = _normalize_step(step)
        if normalized:
            normalized_steps.append(normalized)

    normalized_exams = [item.strip() for item in exams if isinstance(item, str) and item.strip()]
    normalized_certifications = [item.strip() for item in certifications if isinstance(item, str) and item.strip()]
    normalized_skill_roadmap = [item.strip() for item in skill_roadmap if isinstance(item, str) and item.strip()]

    return {
        "steps": normalized_steps[:6],
        "exams": normalized_exams,
        "certifications": normalized_certifications,
        "skillRoadmap": normalized_skill_roadmap,
    }


def generate_roadmap(ability, skills, career):
    prompt = build_roadmap_prompt(ability, skills, career)
    ai_text = call_ai(prompt)
    payload = _extract_json_object(ai_text)
    validated = _validate_roadmap_payload(payload)

    if len(validated["steps"]) < 5:
        return _empty_roadmap_structure()

    return validated
