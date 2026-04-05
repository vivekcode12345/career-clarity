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


def _normalize_text(value):
    return str(value or "").strip().lower()


def _user_timeline_prefix(ability, skills):
    has_skills = bool(skills)
    ability_key = _normalize_text(ability)

    if ability_key == "high" and has_skills:
        return ["Month 1", "Month 2", "Month 3", "Month 4", "Month 5", "Month 6"]
    if ability_key == "low" or not has_skills:
        return ["Month 1-2", "Month 3-4", "Month 5-6", "Month 7-8", "Month 9-10", "Month 11-12"]
    return ["Month 1", "Month 2-3", "Month 4-5", "Month 6-7", "Month 8-9", "Month 10-12"]


def _career_track(career):
    value = _normalize_text(career)
    if any(token in value for token in ["data", "analyst", "machine learning", "ai"]):
        return "data"
    if any(token in value for token in ["software", "developer", "engineer", "web", "backend", "frontend"]):
        return "software"
    if any(token in value for token in ["design", "ui", "ux", "graphic", "creative"]):
        return "design"
    if any(token in value for token in ["marketing", "business", "product", "management", "analyst"]):
        return "business"
    return "general"


def _build_personalized_fallback_roadmap(ability, skills, career):
    known_skills = [str(skill).strip() for skill in (skills or []) if str(skill).strip()]
    known_skills_text = ", ".join(known_skills[:3]) if known_skills else "your current foundation"
    timeline = _user_timeline_prefix(ability, known_skills)
    track = _career_track(career)

    templates = {
        "software": {
            "steps": [
                ("Strengthen coding fundamentals", "Build reliable coding basics using Python/JavaScript and problem solving."),
                ("Build guided portfolio projects", "Create 2-3 projects that align with your target role in software development."),
                ("Learn backend, APIs, and databases", "Practice full-stack workflows and data handling for production-style apps."),
                ("Apply testing and deployment", "Add quality checks, version control, and deployment pipelines."),
                ("Prepare interviews and internships", "Target real job descriptions and practice interview scenarios."),
                ("Specialize in your preferred stack", "Choose frontend/backend/full-stack and deepen practical expertise."),
            ],
            "skills": ["Programming", "Data Structures", "APIs", "Databases", "System Design"],
            "exams": ["NIMCET", "GATE"],
            "certifications": ["AWS Cloud Practitioner", "Meta Front-End Developer"],
        },
        "data": {
            "steps": [
                ("Build statistics and analytics basics", "Learn statistics and data analysis concepts required for data roles."),
                ("Master SQL and data wrangling", "Use SQL and Python tools to clean and prepare datasets."),
                ("Create dashboards and case studies", "Present insights through dashboards and project storytelling."),
                ("Learn machine learning foundations", "Train supervised and unsupervised models on practical datasets."),
                ("Deploy and evaluate models", "Measure model performance and production-readiness."),
                ("Build domain-focused portfolio", "Show industry-relevant data projects with measurable impact."),
            ],
            "skills": ["Statistics", "SQL", "Python", "Machine Learning", "Data Visualization"],
            "exams": ["GATE", "IIT JAM"],
            "certifications": ["Google Data Analytics", "IBM Data Science"],
        },
        "design": {
            "steps": [
                ("Understand design principles", "Build fundamentals in typography, hierarchy, color, and accessibility."),
                ("Learn UI/UX tools", "Practice Figma workflows and user-flow prototyping."),
                ("Run user research and usability tests", "Validate decisions with user insights and feedback loops."),
                ("Create product-ready case studies", "Document problem framing, iterations, and outcomes."),
                ("Build collaborative design workflow", "Work with developers and product teams on handoff quality."),
                ("Niche into a strong specialization", "Choose UX research, interaction design, or visual systems."),
            ],
            "skills": ["Figma", "Wireframing", "User Research", "Prototyping", "Design Systems"],
            "exams": ["UCEED", "NID DAT"],
            "certifications": ["Google UX Design", "Adobe Certified Professional"],
        },
        "business": {
            "steps": [
                ("Build business fundamentals", "Strengthen communication, analysis, and business problem framing."),
                ("Learn tools for business analysis", "Use Excel/SQL/BI tooling for data-backed decisions."),
                ("Practice market and user analysis", "Work on competitor research and customer insights."),
                ("Own mini strategy projects", "Drive end-to-end project planning and execution."),
                ("Develop leadership and stakeholder skills", "Improve presentation, negotiation, and cross-team collaboration."),
                ("Prepare role-specific portfolio", "Show measurable outcomes relevant to analyst/PM/marketing paths."),
            ],
            "skills": ["Communication", "Analytics", "Excel", "SQL", "Strategy"],
            "exams": ["CAT", "XAT"],
            "certifications": ["Google Project Management", "HubSpot Marketing"],
        },
        "general": {
            "steps": [
                ("Explore career directions", "Evaluate interests and strengths through small guided projects."),
                ("Build core digital skills", "Learn communication, productivity tools, and problem solving."),
                ("Pick a focused track", "Choose one career path after comparing outcomes and fit."),
                ("Build entry portfolio", "Create proof-of-work artifacts in the selected track."),
                ("Gain real-world experience", "Do internships, freelancing, or volunteering assignments."),
                ("Apply and iterate", "Apply to roles and improve based on interview feedback."),
            ],
            "skills": ["Communication", "Digital Literacy", "Problem Solving", "Execution"],
            "exams": [],
            "certifications": ["Google Career Certificates"],
        },
    }

    selected = templates.get(track, templates["general"])
    steps = []
    for index, (title, description) in enumerate(selected["steps"]):
        steps.append(
            {
                "title": title,
                "description": f"{description} Focus on {known_skills_text}.",
                "timeline": timeline[index] if index < len(timeline) else f"Phase {index + 1}",
                "resources": [
                    {
                        "title": f"{career} learning guide",
                        "type": "docs",
                        "link": "https://roadmap.sh",
                    },
                    {
                        "title": f"{career} practice track",
                        "type": "practice",
                        "link": "https://www.coursera.org",
                    },
                ],
            }
        )

    skill_roadmap = list(dict.fromkeys((known_skills + selected["skills"])[:8]))

    return {
        "steps": steps,
        "exams": selected["exams"],
        "certifications": selected["certifications"],
        "skillRoadmap": skill_roadmap,
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
    - timeline (example: Month 1, Month 2-3)
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
    timeline = step.get("timeline")
    resources = step.get("resources")

    if not isinstance(title, str) or not title.strip():
        return None
    if not isinstance(description, str) or not description.strip():
        return None
    if timeline is not None and (not isinstance(timeline, str) or not timeline.strip()):
        timeline = None
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
        "timeline": timeline.strip() if isinstance(timeline, str) else "",
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
        return _build_personalized_fallback_roadmap(ability, skills, career)

    return validated
