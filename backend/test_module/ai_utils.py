import requests
import json
from .models import Question
import os
from dotenv import load_dotenv
import logging
import random

load_dotenv()

logger = logging.getLogger(__name__)
MODELS = [
    "mistralai/mixtral-8x7b-instruct",
    "meta-llama/llama-3.1-8b-instruct",
]


def _get_api_key():
    return os.getenv("OPENROUTER_API_KEY")


def build_prompt(skill, num_questions, difficulty_instruction="medium to hard"):
    return f"""
Generate {num_questions} multiple choice questions for {skill} skill.

Rules:
- Each question must have 4 options (A, B, C, D)
- Include correct answer
- Difficulty: {difficulty_instruction}
- Avoid duplicate questions
- Return ONLY JSON
- Do not include markdown code fences

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


def build_quick_test_prompt(class_level, question_type, num_questions, topic_hints=None):
    hints = ", ".join([str(item).strip() for item in (topic_hints or []) if str(item).strip()])
    topic_block = f"Relevant topics to incorporate when appropriate: {hints}." if hints else ""

    return f"""
Generate {num_questions} multiple choice questions for a {class_level} student.

Question type: {question_type}
{topic_block}

Rules:
- Questions must match the student's class level exactly
- Questions should feel relevant to the student's abilities, interests, and chosen skills when topic hints are provided
- Each question must have 4 options (A, B, C, D)
- Include correct answer
- Difficulty: easy to medium
- Avoid duplicate questions
- Return ONLY JSON
- Do not include markdown code fences

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
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict):
            if isinstance(parsed.get("questions"), list):
                return parsed["questions"]
            if isinstance(parsed.get("data"), list):
                return parsed["data"]
        return []
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


def _save_questions(skill, question_items, needed, difficulty_choices=None):
    difficulty_choices = difficulty_choices or ["medium", "hard"]
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
            difficulty=random.choice(difficulty_choices)
        )
        existing_texts.add(question_text)
        created += 1

    return created


def _save_quick_test_questions(class_level, question_type, question_items, needed):
    created = 0
    existing_texts = set(
        Question.objects.filter(type=question_type, class_level=class_level).values_list("question_text", flat=True)
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
            type=question_type,
            category=class_level.lower(),
            difficulty=random.choice(["easy", "medium"]),
            class_level=class_level,
        )
        existing_texts.add(question_text)
        created += 1

    return created


def call_ai(prompt, model):
    api_key = _get_api_key()
    if not api_key:
        return None

    response = requests.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        },
        json={
            "model": model,
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
        },
        timeout=25
    )
    response.raise_for_status()
    data = response.json()

    choices = data.get("choices") or []
    if not choices:
        return None

    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, list):
        text_parts = [
            part.get("text", "")
            for part in content
            if isinstance(part, dict)
        ]
        return "\n".join(text_parts)
    return content


def generate_and_save_questions(skill, required=15, current_count=0, difficulty_choices=None):
    try:
        difficulty_choices = difficulty_choices or ["medium", "hard"]
        difficulty_instruction = " / ".join(difficulty_choices)
        needed = required - current_count

        if needed <= 0:
            return True

        created = 0
        attempts = 0
        max_attempts = 5

        if _get_api_key():
            while created < needed and attempts < max_attempts:
                attempts += 1
                remaining = needed - created
                prompt = build_prompt(
                    skill,
                    min(max(remaining + 2, 5), 25),
                    difficulty_instruction=difficulty_instruction,
                )
                model = MODELS[(attempts - 1) % len(MODELS)]

                ai_response = call_ai(prompt, model)
                ai_questions = _extract_json_array(ai_response)
                created_now = _save_questions(skill, ai_questions, remaining, difficulty_choices=difficulty_choices)
                created += created_now

                if created_now == 0:
                    logger.warning(
                        "No valid questions created for skill=%s on attempt=%s model=%s",
                        skill,
                        attempts,
                        model,
                    )

        if created < needed:
            logger.warning(
                "Skill question generation incomplete for %s. Needed=%s, created=%s, attempts=%s",
                skill,
                needed,
                created,
                attempts,
            )
            return False

        return True

    except Exception as e:
        logger.exception("Question generation failed for skill '%s': %s", skill, e)
        return False


def generate_and_save_quick_test_questions(class_level, required_general=5, required_interest=3, topic_hints=None):
    """Generate missing quick-test questions for the given class level."""
    try:
        created_total = 0

        for question_type, required in (("general", required_general), ("interest", required_interest)):
            existing_count = Question.objects.filter(type=question_type, class_level=class_level).count()
            needed = required - existing_count
            if needed <= 0:
                continue

            attempts = 0
            max_attempts = 4

            while needed > 0 and attempts < max_attempts:
                attempts += 1
                prompt = build_quick_test_prompt(
                    class_level,
                    question_type,
                    min(max(needed + 2, 5), 10),
                    topic_hints=topic_hints,
                )
                model = MODELS[(attempts - 1) % len(MODELS)]

                ai_response = call_ai(prompt, model)
                ai_questions = _extract_json_array(ai_response)
                created_now = _save_quick_test_questions(class_level, question_type, ai_questions, needed)
                created_total += created_now
                needed -= created_now

                if created_now == 0:
                    logger.warning(
                        "No valid quick-test questions created for class_level=%s type=%s attempt=%s model=%s",
                        class_level,
                        question_type,
                        attempts,
                        model,
                    )

        return created_total > 0
    except Exception as e:
        logger.exception("Quick test question generation failed for class '%s': %s", class_level, e)
        return False