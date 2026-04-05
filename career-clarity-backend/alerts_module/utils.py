from datetime import timedelta

from django.utils import timezone


def _to_tokens(values):
    if not values:
        return set()

    if isinstance(values, dict):
        values = list(values.keys()) + list(values.values())

    if isinstance(values, str):
        values = [values]

    tokens = set()
    for value in values:
        if not isinstance(value, str):
            continue
        for token in value.lower().replace("/", " ").replace("-", " ").split():
            clean = token.strip()
            if clean:
                tokens.add(clean)
    return tokens


def rank_alerts(alerts, interest, skills):
    interest_tokens = _to_tokens(interest)
    skill_tokens = _to_tokens(skills)

    scored = []
    for alert in alerts:
        haystack = " ".join(
            [
                getattr(alert, "title", ""),
                getattr(alert, "description", ""),
                " ".join(getattr(alert, "tags", []) if isinstance(getattr(alert, "tags", []), list) else []),
            ]
        ).lower()

        score = 1
        if any(token in haystack for token in interest_tokens):
            score += 5
        if any(token in haystack for token in skill_tokens):
            score += 3

        scored.append((score, alert))

    scored.sort(key=lambda item: (item[0], getattr(item[1], "created_at", None)), reverse=True)
    return [item[1] for item in scored]


def _flatten_profile_values(payload):
    if not payload:
        return []
    if isinstance(payload, dict):
        values = []
        for value in payload.values():
            if isinstance(value, (list, tuple, set)):
                values.extend([str(item).strip() for item in value if str(item).strip()])
            else:
                cleaned = str(value).strip()
                if cleaned:
                    values.append(cleaned)
        return values
    if isinstance(payload, (list, tuple, set)):
        return [str(item).strip() for item in payload if str(item).strip()]
    cleaned = str(payload).strip()
    return [cleaned] if cleaned else []


def _join_with_and(items):
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} and {items[1]}"
    return f"{', '.join(items[:-1])}, and {items[-1]}"


def _normalize_level(level):
    raw = (level or "").strip().upper()
    if raw in {"10", "CLASS 10", "10TH"}:
        return "10"
    if raw in {"12", "CLASS 12", "12TH", "INTERMEDIATE"}:
        return "12"
    if raw in {"UG", "UNDERGRAD", "UNDERGRADUATE", "BACHELOR"}:
        return "UG"
    if raw in {"PG", "POSTGRAD", "POSTGRADUATE", "MASTER"}:
        return "PG"
    return ""


def generate_recommendation_reason(user, opportunity):
    from accounts.models import Profile
    from cv_module.models import CVProfile

    reasons = []
    default_reason = "This opportunity is suitable based on your profile."

    if not user or not opportunity:
        return default_reason

    profile = Profile.objects.filter(user=user).first()
    cv_profile = CVProfile.objects.filter(user=user).first()

    raw_interests = _flatten_profile_values(getattr(profile, "interests", []) if profile else [])
    raw_skills = _flatten_profile_values(getattr(cv_profile, "skills", []) if cv_profile else [])

    fallback_skills = _flatten_profile_values(getattr(profile, "skills", []) if profile else [])
    if not raw_skills and fallback_skills:
        raw_skills = fallback_skills

    tags = getattr(opportunity, "tags", [])
    tags = tags if isinstance(tags, list) else []
    opportunity_haystack = " ".join(
        [
            getattr(opportunity, "title", "") or "",
            getattr(opportunity, "description", "") or "",
            " ".join(tags),
        ]
    ).lower()

    matched_interest = None
    for interest in raw_interests:
        interest_tokens = _to_tokens(interest)
        if interest_tokens and any(token in opportunity_haystack for token in interest_tokens):
            matched_interest = interest
            break

    if matched_interest:
        reasons.append(f"matches your interest in {matched_interest}")

    matched_skill = None
    for skill in raw_skills:
        skill_tokens = _to_tokens(skill)
        if skill_tokens and any(token in opportunity_haystack for token in skill_tokens):
            matched_skill = skill
            break

    if matched_skill:
        reasons.append(f"uses your skill {matched_skill}")

    user_level = _normalize_level(
        (getattr(profile, "class_level", "") if profile else "")
        or (getattr(profile, "education_level", "") if profile else "")
    )
    opportunity_level = _normalize_level(getattr(opportunity, "level", ""))
    if user_level and opportunity_level and user_level == opportunity_level:
        reasons.append("fits your current academic level")

    deadline = getattr(opportunity, "deadline", None)
    today = timezone.now().date()
    if deadline and today <= deadline <= (today + timedelta(days=7)):
        reasons.append("deadline is approaching soon")

    if not reasons:
        return default_reason

    return f"This opportunity is recommended because {_join_with_and(reasons)}."
