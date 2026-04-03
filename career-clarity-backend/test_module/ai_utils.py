import requests
import json
from .models import Question
import os
from dotenv import load_dotenv
import logging
import random

load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")
logger = logging.getLogger(__name__)


def build_prompt(skill, num_questions):
    return f"""
Generate {num_questions} multiple choice questions for {skill} skill.

Rules:
- Each question must have 4 options (A, B, C, D)
- Include correct answer
- Difficulty: medium to hard
- Avoid duplicate questions
- Return ONLY JSON

Format:
[
  {{
    "question": "...",
    "A": "...",
    "B": "...",
    "C": "...",
    "D": "...",
    "answer": "A"
  }}
]
"""


def _extract_json_array(content):
    if not content:
        return []

    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()

    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, list) else []
    except json.JSONDecodeError:
        start = cleaned.find("[")
        end = cleaned.rfind("]")
        if start == -1 or end == -1 or end <= start:
            return []
        try:
            parsed = json.loads(cleaned[start:end + 1])
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []


def _normalized_question_payload(item):
    required = ["question", "A", "B", "C", "D", "answer"]
    if not isinstance(item, dict) or not all(key in item for key in required):
        return None

    answer = str(item.get("answer", "")).strip().upper()
    if answer not in {"A", "B", "C", "D"}:
        return None

    payload = {
        "question": str(item["question"]).strip(),
        "A": str(item["A"]).strip(),
        "B": str(item["B"]).strip(),
        "C": str(item["C"]).strip(),
        "D": str(item["D"]).strip(),
        "answer": answer,
    }

    if not payload["question"]:
        return None

    return payload


def _save_questions(skill, question_items, needed):
    created = 0
    existing_texts = set(
        Question.objects.filter(type="skill", category=skill).values_list("question_text", flat=True)
    )

    for item in question_items:
        if created >= needed:
            break

        normalized = _normalized_question_payload(item)
        if not normalized:
            continue

        question_text = normalized["question"]
        if question_text in existing_texts:
            continue

        Question.objects.create(
            question_text=question_text,
            option_a=normalized["A"],
            option_b=normalized["B"],
            option_c=normalized["C"],
            option_d=normalized["D"],
            correct_answer=normalized["answer"],
            type="skill",
            category=skill,
            difficulty=random.choice(["medium", "hard"])
        )
        existing_texts.add(question_text)
        created += 1

    return created


def call_ai(prompt):
    if not API_KEY:
        return None

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "mistralai/mixtral-8x7b-instruct",
            "messages": [
                {"role": "user", "content": prompt}
            ]
        },
        timeout=25
    )
    response.raise_for_status()
    data = response.json()

    choices = data.get("choices") or []
    if not choices:
        return None

    message = choices[0].get("message") or {}
    return message.get("content")


def generate_and_save_questions(skill, required=15, current_count=0):
    try:
        needed = required - current_count

        if needed <= 0:
            return True

        created = 0

        if API_KEY:
            prompt = build_prompt(skill, needed)
            ai_response = call_ai(prompt)
            ai_questions = _extract_json_array(ai_response)
            created += _save_questions(skill, ai_questions, needed)

        if created < needed:
            logger.warning(
                "Skill question generation incomplete for %s. Needed=%s, created=%s",
                skill,
                needed,
                created,
            )
            return False

        return True

    except Exception as e:
        logger.exception("Question generation failed for skill '%s': %s", skill, e)
        return False