from datetime import timedelta
import hashlib

from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from core.api_response import success_response

from accounts.models import Profile, UserPreference
from cv_module.models import CVProfile
from test_module.models import TestResult

from alerts_module.models import Opportunity, UserAlertCache
from alerts_module.run_fetchers import run_all_fetchers
from .utils import _to_tokens, rank_alerts, generate_recommendation_reason


ALERT_CACHE_TTL_HOURS = 12
CACHE_SCHEMA_VERSION = "v2"


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

    return "12"


def _format_eligibility(level):
    label_map = {
        "10": "Class 10 students",
        "12": "Class 12 students",
        "UG": "Undergraduate students",
        "PG": "Postgraduate students",
    }
    return label_map.get(level, "Students matching the listed level")


def _unique_offset_days(opportunity):
    seed = f"{getattr(opportunity, 'id', '')}|{getattr(opportunity, 'title', '')}|{getattr(opportunity, 'type', '')}"
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    return 14 + (int(digest[:6], 16) % 76)


def _deadline_display(opportunity):
    if opportunity.deadline:
        return opportunity.deadline.isoformat()

    base_date = getattr(opportunity, "created_at", None) or timezone.now()
    estimated = (base_date + timedelta(days=_unique_offset_days(opportunity))).date()
    return f"Expected window closes around {estimated.isoformat()} (verify on official portal)"


def _alert_keywords(opportunity):
    tags = opportunity.tags if isinstance(opportunity.tags, list) else []
    text = " ".join([
        getattr(opportunity, "title", "") or "",
        getattr(opportunity, "description", "") or "",
        " ".join(tags),
    ]).lower()
    return text, tags


def _build_eligibility(opportunity):
    level_text = _format_eligibility(opportunity.level)
    opportunity_type = (opportunity.type or "").lower()
    text, _ = _alert_keywords(opportunity)

    if opportunity_type == "internship":
        if "remote" in text:
            return f"{level_text} with relevant project skills; remote-friendly roles may prioritize portfolio quality"
        return f"{level_text} with relevant project skills and ability to commit to internship duration"

    if opportunity_type == "job":
        if "manager" in text or "senior" in text:
            return f"{level_text}; typically requires prior professional experience for leadership responsibilities"
        return f"{level_text}; suitable for candidates meeting role-specific technical and communication criteria"

    if opportunity_type == "exam":
        if "medical" in text or "neet" in text:
            return f"{level_text} from eligible science background as specified in official exam brochure"
        if "engineering" in text or "jee" in text or "gate" in text:
            return f"{level_text} meeting mathematics/science eligibility in the official information bulletin"
        return f"{level_text} meeting official exam authority criteria"

    if opportunity_type == "scholarship":
        if "merit" in text:
            return f"{level_text} with strong academic performance as per scholarship merit cut-off"
        if "minority" in text or "disadvantaged" in text:
            return f"{level_text} belonging to eligible community/category with valid supporting documents"
        return f"{level_text} fulfilling scholarship-specific academic and document requirements"

    return f"{level_text} meeting opportunity-specific criteria"


def _build_detail_points(opportunity, deadline_display):
    tags = opportunity.tags if isinstance(opportunity.tags, list) else []
    top_tags = ", ".join(tags[:3]) if tags else "General"
    description = (opportunity.description or "").strip()
    summary = description.split(".")[0] if description else "Review official listing for complete scope"

    return [
        f"Category: {opportunity.type.title()} for { _format_eligibility(opportunity.level).lower() }",
        f"Focus area: {top_tags}",
        f"Deadline insight: {deadline_display}",
        f"Summary: {summary}",
    ]


def _build_requirements(opportunity):
    text, tags = _alert_keywords(opportunity)
    requirement_set = [
        _build_eligibility(opportunity),
        "Valid academic records and government ID/document proofs",
    ]

    if opportunity.type == "scholarship":
        requirement_set.append("Income/merit/category certificates if required by scheme guidelines")
    if opportunity.type == "internship":
        requirement_set.append("Updated resume and at least one project/portfolio proof")
    if opportunity.type == "job":
        requirement_set.append("Updated resume with relevant role skills and availability details")
    if opportunity.type == "exam":
        requirement_set.append("Official exam registration, photo/signature upload, and fee submission")

    if "remote" in text:
        requirement_set.append("Reliable internet and communication readiness for remote process")
    if tags:
        requirement_set.append(f"Preferred profile signals: {', '.join(tags[:4])}")

    return requirement_set


def _build_application_steps(opportunity):
    steps = [
        f"Open the official {opportunity.type} link and read the latest notification carefully",
        "Confirm eligibility, required documents, and fee/details before submission",
    ]

    if opportunity.type in {"internship", "job"}:
        steps.append("Submit role application with resume/portfolio and track recruiter updates")
    elif opportunity.type == "exam":
        steps.append("Complete registration, download admit updates, and monitor exam authority notices")
    else:
        steps.append("Fill scholarship form, upload proofs, and keep acknowledgment for verification")

    steps.append("Set reminders for important milestones and verify status on official portal")
    return steps


def _eligible_levels_for_user(level):
    level = (level or "").upper()
    level_map = {
        "10": ["10", "12"],
        "12": ["12"],
        "UG": ["UG", "PG"],
        "PG": ["PG"],
    }
    return level_map.get(level, ["12"])


def _is_opportunity_eligible_for_user(opportunity, user_level):
    user_level = (user_level or "").upper()
    opportunity_level = (getattr(opportunity, "level", "") or "").upper()
    opportunity_type = (getattr(opportunity, "type", "") or "").lower()

    if user_level == "10":
        return opportunity_level in {"10", "12"} or opportunity_type in {"scholarship", "exam"}

    if user_level == "12":
        return opportunity_level == "12" or opportunity_type in {"scholarship", "exam"}

    if user_level == "UG":
        return opportunity_level in {"UG", "PG"} or opportunity_type in {"scholarship", "exam", "internship", "job"}

    if user_level == "PG":
        return opportunity_level == "PG" or opportunity_type in {"scholarship", "exam", "job", "internship"}

    return True


def _normalize_interest_payload(payload):
    if not payload:
        return []
    if isinstance(payload, dict):
        values = []
        for value in payload.values():
            if isinstance(value, (list, tuple, set)):
                values.extend(list(value))
            else:
                values.append(value)
        return values
    if isinstance(payload, (list, tuple, set)):
        return list(payload)
    return [payload]


def _build_signature(values):
    tokens = sorted(_to_tokens(values))
    return "|".join(tokens)


def _get_preference_map(user):
    pref, _ = UserPreference.objects.get_or_create(user=user)
    return {
        "internship": bool(pref.internship),
        "job": bool(pref.job),
        "scholarship": bool(pref.scholarship),
        "exam": bool(pref.exam),
    }


def _preference_signature(pref_map):
    return "|".join([f"{key}:{int(pref_map.get(key, True))}" for key in ["internship", "job", "scholarship", "exam"]])


def _is_type_enabled(opportunity_type, pref_map):
    key = str(opportunity_type or "").strip().lower()
    return bool(pref_map.get(key, True))


def _filter_opportunities_by_preferences(opportunities, pref_map):
    return [item for item in opportunities if _is_type_enabled(getattr(item, "type", ""), pref_map)]


def _filter_serialized_alerts_by_preferences(alerts, pref_map):
    filtered = []
    for item in alerts:
        if not isinstance(item, dict):
            continue
        if _is_type_enabled(item.get("type"), pref_map):
            filtered.append(item)
    return filtered


def _alert_haystack(opportunity):
    tags = opportunity.tags if isinstance(opportunity.tags, list) else []
    return " ".join(
        [
            opportunity.title or "",
            opportunity.description or "",
            opportunity.source or "",
            " ".join(tags),
        ]
    ).lower()


def _filter_by_interest(alerts, interests, skills):
    interest_tokens = _to_tokens(interests)
    skill_tokens = _to_tokens(skills)

    if not interest_tokens and not skill_tokens:
        return alerts

    matched = []
    for opportunity in alerts:
        haystack = _alert_haystack(opportunity)
        if any(token in haystack for token in interest_tokens) or any(token in haystack for token in skill_tokens):
            matched.append(opportunity)

    return matched or alerts


def _serialize_opportunity(opportunity):
    tags = opportunity.tags or []
    deadline_display = _deadline_display(opportunity)
    detail_points = _build_detail_points(opportunity, deadline_display)
    requirements = _build_requirements(opportunity)
    application_steps = _build_application_steps(opportunity)
    eligibility_text = _build_eligibility(opportunity)

    return {
        "id": opportunity.id,
        "title": opportunity.title,
        "type": opportunity.type,
        "level": opportunity.level,
        "eligibility": eligibility_text,
        "description": opportunity.description,
        "link": opportunity.link,
        "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
        "deadline_display": deadline_display,
        "source": opportunity.source,
        "tags": tags,
        "detail_points": detail_points,
        "requirements": requirements,
        "application_steps": application_steps,
        "official_note": "Always verify eligibility and deadlines on the official portal before submitting.",
        "created_at": opportunity.created_at.isoformat() if opportunity.created_at else None,
    }


def _serialize_recommended_opportunity(user, opportunity):
    return {
        "id": opportunity.id,
        "title": opportunity.title,
        "type": opportunity.type,
        "description": opportunity.description,
        "link": opportunity.link,
        "deadline": opportunity.deadline.isoformat() if opportunity.deadline else None,
        "tags": opportunity.tags if isinstance(opportunity.tags, list) else [],
        "reason": generate_recommendation_reason(user, opportunity),
    }


def _serialize_cached_recommended_with_reason(user, cached_recommended):
    default_reason = "This opportunity is suitable based on your profile."

    ids = [item.get("id") for item in cached_recommended if isinstance(item, dict) and item.get("id")]
    opportunity_map = {obj.id: obj for obj in Opportunity.objects.filter(id__in=ids)} if ids else {}

    payload = []
    for item in cached_recommended:
        if not isinstance(item, dict):
            continue

        opportunity = opportunity_map.get(item.get("id"))
        reason = generate_recommendation_reason(user, opportunity) if opportunity else default_reason
        payload.append(
            {
                "id": item.get("id"),
                "title": item.get("title"),
                "type": item.get("type"),
                "description": item.get("description"),
                "link": item.get("link"),
                "deadline": item.get("deadline"),
                "tags": item.get("tags") if isinstance(item.get("tags"), list) else [],
                "reason": reason,
            }
        )
    return payload


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_alerts(request):
    user = request.user

    profile = Profile.objects.filter(user=user).first()
    raw_level = ""
    if profile:
        raw_level = getattr(profile, "class_level", "") or getattr(profile, "education_level", "")
    level = _normalize_level(raw_level)

    latest_test = TestResult.objects.filter(user=user).order_by("-created_at").first()
    profile_interests = _normalize_interest_payload(getattr(profile, "interests", []) if profile else [])
    test_interests = _normalize_interest_payload(latest_test.interest_data if latest_test else {})
    interest = profile_interests + test_interests

    cv_profile = CVProfile.objects.filter(user=user).first()
    skills = cv_profile.skills if cv_profile else []
    preference_map = _get_preference_map(user)
    preference_signature = _preference_signature(preference_map)

    try:
        page = max(int(request.query_params.get("page", 1)), 1)
    except (TypeError, ValueError):
        page = 1

    try:
        page_size = int(request.query_params.get("page_size", 10))
    except (TypeError, ValueError):
        page_size = 10
    page_size = min(max(page_size, 1), 50)

    interest_signature = _build_signature(interest)
    skill_signature = _build_signature(skills)
    cache_interest_signature = f"{CACHE_SCHEMA_VERSION}|{interest_signature}|prefs:{preference_signature}"
    cache_skill_signature = f"{CACHE_SCHEMA_VERSION}|{skill_signature}"

    refresh_requested = request.query_params.get("refresh") == "1"
    cache = UserAlertCache.objects.filter(user=user).first()
    cache_fresh = bool(
        cache
        and isinstance(cache.alerts, list)
        and cache.alerts
        and not refresh_requested
        and cache.user_level == level
        and cache.interest_signature == cache_interest_signature
        and cache.skill_signature == cache_skill_signature
        and (timezone.now() - cache.updated_at) <= timedelta(hours=ALERT_CACHE_TTL_HOURS)
    )

    if cache_fresh:
        cached_alerts = _filter_serialized_alerts_by_preferences(cache.alerts, preference_map)
        cached_recommended = cached_alerts[:50]
        total_count = cache.total_available or len(cached_alerts)
        start = (page - 1) * page_size
        end = start + page_size
        paged_alerts = cached_alerts[start:end]
        total_pages = (total_count + page_size - 1) // page_size if total_count else 1
        return success_response(
            data={
                "recommended": _serialize_cached_recommended_with_reason(user, cached_recommended),
                "results": paged_alerts,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "total_count": total_count,
                "user_level": level,
                "cached": True,
                "cache_updated_at": cache.updated_at.isoformat() if cache.updated_at else None,
            },
            message="Alerts loaded from cache",
        )

    try:
        run_all_fetchers()
    except Exception:
        pass

    eligible_levels = _eligible_levels_for_user(level)
    alerts_queryset = Opportunity.objects.filter(level__in=eligible_levels).order_by("-created_at")
    alerts = [item for item in alerts_queryset if _is_opportunity_eligible_for_user(item, level)]
    alerts = _filter_opportunities_by_preferences(alerts, preference_map)

    if not alerts:
        fallback = list(Opportunity.objects.all().order_by("-created_at"))
        alerts = _filter_opportunities_by_preferences(fallback, preference_map)

    filtered_alerts = _filter_by_interest(alerts, interest, skills)
    ranked_alerts = rank_alerts(filtered_alerts, interest, skills)

    recommended = ranked_alerts[:50]
    all_alerts = ranked_alerts

    start = (page - 1) * page_size
    end = start + page_size
    paged_alerts = [_serialize_opportunity(item) for item in all_alerts[start:end]]

    UserAlertCache.objects.update_or_create(
        user=user,
        defaults={
            "user_level": level,
            "interest_signature": cache_interest_signature,
            "skill_signature": cache_skill_signature,
            "alerts": [_serialize_opportunity(item) for item in all_alerts],
            "total_available": len(all_alerts),
        },
    )

    return success_response(
        data={
            "recommended": [_serialize_recommended_opportunity(user, item) for item in recommended],
            "results": paged_alerts,
            "page": page,
            "page_size": page_size,
            "total_pages": (len(all_alerts) + page_size - 1) // page_size if all_alerts else 1,
            "total_count": len(all_alerts),
            "user_level": level,
            "cached": False,
        }
    )
