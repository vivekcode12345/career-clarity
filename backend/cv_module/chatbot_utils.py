"""Utility helpers for the career guidance chatbot.

This module keeps the chatbot logic separated from the view so it can be
tested and reused independently.
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional

import requests
from dotenv import load_dotenv


load_dotenv()

OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "mistralai/mixtral-8x7b-instruct")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
OPENROUTER_SITE_URL = os.getenv("OPENROUTER_SITE_URL", "http://localhost:5173")
OPENROUTER_APP_NAME = os.getenv("OPENROUTER_APP_NAME", "CareerClarity")

FOLLOW_UP_HINTS = {
    "india",
    "in india",
    "usa",
    "uk",
    "canada",
    "australia",
    "for me",
    "for my profile",
    "based on my profile",
    "and in india",
}



def _normalize_value(value: Any) -> List[str]:
    """Convert JSON/string/list values into a clean list of strings."""
    if value is None:
        return []
    if isinstance(value, list):
        items = value
    elif isinstance(value, dict):
        items = [f"{key}: {val}" for key, val in value.items()]
    elif isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, (list, dict)):
                return _normalize_value(parsed)
        except Exception:
            pass
        items = [part.strip() for part in re.split(r"[,;]", value) if part.strip()]
    else:
        items = [str(value)]

    normalized = []
    seen = set()
    for item in items:
        text = str(item).strip()
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        normalized.append(text)
    return normalized


def is_relevant_question(message: str) -> bool:
    """Return True for any non-empty message.

    Topic restriction is handled by the AI prompt instead of keyword filtering.
    """
    text = (message or "").strip().lower()
    if not text:
        return False

    return True


def resolve_followup_message(message: str, conversation_history: Optional[List[Dict[str, str]]] = None) -> str:
    """Merge short follow-up prompts with the previous user question for continuity.

    Example: previous="top 10 colleges for me" and current="in india"
    becomes "top 10 colleges for me in india".
    """
    current = (message or "").strip()
    if not current:
        return current

    normalized_current = current.lower()
    words = normalized_current.split()
    is_short_followup = len(words) <= 6
    has_followup_cue = (
        normalized_current in FOLLOW_UP_HINTS
        or normalized_current.startswith("in ")
        or normalized_current.startswith("for ")
        or normalized_current.startswith("only ")
    )

    if not (is_short_followup and has_followup_cue):
        return current

    history = conversation_history or []
    previous_user_messages = [
        (item.get("text") or "").strip()
        for item in history
        if isinstance(item, dict) and (item.get("role") or "").strip().lower() == "user"
    ]

    for previous in reversed(previous_user_messages):
        if not previous:
            continue
        if previous.lower() == normalized_current:
            continue
        if len(previous.split()) < 4:
            continue

        merged = f"{previous.rstrip('?.! ,')} {current.lstrip(',. ')}"
        return merged.strip()

    return current


def _get_user_context(user) -> Dict[str, Any]:
    """Collect the latest user profile data used to personalize the prompt."""
    from accounts.models import Profile
    from cv_module.models import CVProfile
    from test_module.models import SkillTestResult, TestResult

    profile = Profile.objects.filter(user=user).first()
    cv_profile = CVProfile.objects.filter(user=user).first()
    latest_interest_test = TestResult.objects.filter(user=user).order_by("-created_at").first()
    latest_skill_test = SkillTestResult.objects.filter(user=user).order_by("-created_at").first()

    profile_skills = _normalize_value(getattr(profile, "skills", []))
    cv_skills = _normalize_value(getattr(cv_profile, "skills", []))
    merged_skills = _normalize_value(profile_skills + cv_skills)

    return {
        "username": user.get_username(),
        "email": getattr(profile, "email", "") or user.email or "",
        "full_name": getattr(profile, "full_name", "") or user.get_username(),
        "education_level": getattr(profile, "education_level", "") or "Not specified",
        "interests": _normalize_value(getattr(profile, "interests", [])),
        "interest_data": _normalize_value(getattr(latest_interest_test, "interest_data", {})),
        "skills": merged_skills,
        "skill_level": getattr(latest_skill_test, "level", "") or "Not assessed yet",
        "skill_name": getattr(latest_skill_test, "skill", "") or "",
        "quick_test_attempted": bool(latest_interest_test),
        "skill_test_attempted": bool(latest_skill_test),
    }


def build_prompt(
    user,
    message: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    flow_context: Optional[Dict[str, Any]] = None,
) -> str:
    """Build a strict, concise prompt for the OpenRouter model."""
    context = _get_user_context(user)

    interest_text = ", ".join(context["interest_data"] or context["interests"]) or "No interest data available"
    skills_text = ", ".join(context["skills"]) or "No skills available yet"

    skill_level_text = context["skill_level"]
    if context["skill_name"] and skill_level_text != "Not assessed yet":
        skill_level_text = f"{skill_level_text} in {context['skill_name']}"

    system_rules = (
        "You are a career guidance chatbot for students and job seekers. "
        "You must preserve continuity with recent conversation history in this session. "
        "If user asks follow-up questions, continue from prior context instead of restarting. "
        "Align guidance with the user's app flow stage and suggest the next logical step. "
        "Only answer questions related to career, learning, skills, education, and programming. "
        "If the user asks anything unrelated, reply in 2 short lines: one refusal line and one suggestion line. "
        "Start with: 'I can only help with career and education related questions.' "
        "Use the user's profile data to personalize the guidance when the question is relevant. "
        "Be concise, practical, and helpful. Avoid unnecessary fluff. "
        "For relevant answers, use this format: short intro, then 3-6 bullet points, then one short closing line. "
        "Keep answers complete and contextually consistent with the conversation history."
    )

    user_context = (
        f"Username: {context['username']}\n"
        f"Email: {context['email'] or 'Not provided'}\n"
        f"User name: {context['full_name']}\n"
        f"Education level: {context['education_level']}\n"
        f"Interests: {interest_text}\n"
        f"CV skills: {skills_text}\n"
        f"Latest skill level: {skill_level_text}\n"
        f"Quick test attempted: {'Yes' if context['quick_test_attempted'] else 'No'}\n"
        f"Skill test attempted: {'Yes' if context['skill_test_attempted'] else 'No'}\n"
    )

    history_lines = []
    for item in conversation_history or []:
        role = (item.get("role") or "").strip().lower()
        text = (item.get("text") or "").strip()
        if role in {"user", "bot"} and text:
            speaker = "User" if role == "user" else "Assistant"
            history_lines.append(f"{speaker}: {text}")
    history_text = "\n".join(history_lines[-8:]) or "No previous chat in this session."

    flow_context = flow_context or {}
    route = flow_context.get("currentRoute") or "Unknown"
    next_test_label = flow_context.get("nextTestLabel") or "Quick Test"
    flow_note = (
        f"Current app route: {route}\n"
        f"Suggested next test label: {next_test_label}\n"
    )

    return (
        f"{system_rules}\n\n"
        f"User context:\n{user_context}\n"
        f"App flow context:\n{flow_note}\n"
        f"Session conversation history:\n{history_text}\n\n"
        f"User question: {message.strip()}\n\n"
        "If the question is unrelated, give the refusal sentence above and one short suggestion sentence only. Otherwise, answer in a clear and concise way using bullets. "
        "Keep the response short, skimmable, and easy to understand. If relevant, connect the answer to the user's interests or skills."
    )


def format_short_reply(reply: str, max_chars: int = 1400, max_lines: int = 24) -> str:
    """Normalize model output while preserving full useful response content."""
    text = (reply or "").strip()
    if not text:
        return ""

    lines = [line.strip() for line in text.splitlines() if line.strip()]
    compact = "\n".join(lines[:max_lines])

    if len(compact) > max_chars:
        compact = compact[: max_chars].rstrip()

    return compact


def call_ai(prompt: str) -> Optional[str]:
    """Call the OpenRouter API and return the model response text.

    Returns None if the request fails for any reason.
    """
    if not OPENROUTER_API_KEY:
        return None

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": OPENROUTER_SITE_URL,
        "X-Title": OPENROUTER_APP_NAME,
    }

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": "You are a helpful career guidance assistant."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 320,
    }

    try:
        response = requests.post(
            OPENROUTER_API_URL,
            headers=headers,
            json=payload,
            timeout=30,
        )
        response.raise_for_status()

        data = response.json()
        choices = data.get("choices") or []
        if not choices:
            return None

        message = choices[0].get("message") or {}
        content = (message.get("content") or "").strip()
        return content or None
    except (requests.RequestException, ValueError, KeyError, TypeError):
        return None
