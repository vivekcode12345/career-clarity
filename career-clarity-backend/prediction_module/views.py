from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from core.api_response import success_response, error_response
from test_module.models import TestResult, SkillTestResult
from cv_module.models import CVProfile
from accounts.models import Profile, UserPreference
from alerts_module.models import Opportunity, UserAlertCache
from .models import (
    SavedRoadmap,
    UserRecommendationCache,
    College,
    CollegeRecommendationCache,
    CollegeDetailsInsightCache,
)
from .roadmap_utils import generate_roadmap
from .utils import (
    get_ability_level,
    generate_ai_recommendations,
    normalize_user_level,
    get_skill_gap,
    estimate_career_timeline,
    get_recommended_courses,
    rank_colleges,
    generate_ai_college_highlights,
    paginate_items,
    build_college_filter_signature,
    parse_college_courses,
)
import logging
import json

logger = logging.getLogger(__name__)
RECOMMENDATION_CACHE_VERSION = "v4_personalized_recommendation_timeline"

DEFAULT_COLLEGES = [
    {
        "name": "Sri Chaitanya Junior College",
        "location": "Hyderabad",
        "courses": ["MPC", "BiPC", "MEC", "CEC"],
        "fees": 85000,
        "rating": 4.1,
        "type": "junior",
        "apply_link": "https://www.srichaitanya.net",
    },
    {
        "name": "Narayana Junior College",
        "location": "Vijayawada",
        "courses": ["MPC", "BiPC"],
        "fees": 90000,
        "rating": 4.0,
        "type": "junior",
        "apply_link": "https://www.narayanagroup.com",
    },
    {
        "name": "Delhi Technical University",
        "location": "Delhi",
        "courses": ["B.Tech", "BSc Computer Science"],
        "fees": 210000,
        "rating": 4.5,
        "type": "ug",
        "apply_link": "https://www.dtu.ac.in",
    },
    {
        "name": "Pune Institute of Technology",
        "location": "Pune",
        "courses": ["BCA", "BSc"],
        "fees": 120000,
        "rating": 4.0,
        "type": "ug",
        "apply_link": "https://www.unipune.ac.in",
    },
    {
        "name": "Mumbai School of Business",
        "location": "Mumbai",
        "courses": ["BBA", "BCom"],
        "fees": 280000,
        "rating": 4.2,
        "type": "ug",
        "apply_link": "https://www.nmims.edu",
    },
    {
        "name": "IIT Madras",
        "location": "Chennai",
        "courses": ["M.Tech", "MSc"],
        "fees": 320000,
        "rating": 4.8,
        "type": "pg",
        "apply_link": "https://www.iitm.ac.in",
    },
    {
        "name": "IIM Ahmedabad",
        "location": "Ahmedabad",
        "courses": ["MBA"],
        "fees": 450000,
        "rating": 4.9,
        "type": "pg",
        "apply_link": "https://www.iima.ac.in",
    },
]


def _extract_user_level(profile):
    raw_level = getattr(profile, "class_level", None) or getattr(profile, "education_level", "")
    return normalize_user_level(raw_level)


def _build_college_user_profile(user, request):
    profile = Profile.objects.filter(user=user).first()
    user_level = _extract_user_level(profile)

    test = TestResult.objects.filter(user=user).order_by("-created_at").first()
    ability = get_ability_level(test.general_score) if test else "medium"

    if test and getattr(test, "interest_data", None):
        interest = max(test.interest_data, key=test.interest_data.get)
    elif profile and isinstance(profile.interests, list) and profile.interests:
        interest = str(profile.interests[0])
    else:
        interest = "general"

    try:
        cv = CVProfile.objects.get(user=user)
        skills = cv.skills if isinstance(cv.skills, list) else []
    except CVProfile.DoesNotExist:
        skills = profile.skills if profile and isinstance(profile.skills, list) else []

    course_override = (request.GET.get("course") or "").strip()
    recommended_courses = get_recommended_courses(user_level, interest, course_override=course_override)

    max_fee_raw = (request.GET.get("max_fee") or request.GET.get("fees") or "").strip().lower()
    max_fee = None
    if max_fee_raw:
        fee_aliases = {
            "low": 150000,
            "medium": 300000,
            "high": 1000000,
        }
        if max_fee_raw in fee_aliases:
            max_fee = fee_aliases[max_fee_raw]
        else:
            cleaned = "".join(ch for ch in max_fee_raw if ch.isdigit())
            if cleaned:
                try:
                    max_fee = int(cleaned)
                except ValueError:
                    max_fee = None

    return {
        "user_level": user_level,
        "ability": ability,
        "interest": interest,
        "skills": skills,
        "recommended_courses": recommended_courses,
        "location": (request.GET.get("location") or "").strip(),
        "max_fee": max_fee,
        "course_override": course_override,
    }


def _skills_signature(skills):
    return json.dumps(skills or [], sort_keys=True, default=str)


def _eligible_college_type(user_level):
    if user_level == "10":
        return "junior"
    if user_level == "12":
        return "ug"
    return "pg"


def _is_relevant_college(college, user_profile):
    courses = college.courses if isinstance(college.courses, list) else []
    recommended_courses = [str(item).strip().lower() for item in (user_profile.get("recommended_courses") or []) if item]
    skills = [str(item).strip().lower() for item in (user_profile.get("skills") or []) if item]
    interest = str(user_profile.get("interest") or "").strip().lower()

    blob = " ".join([college.name, college.location, " ".join(courses)]).lower()

    if any(course.lower() in blob for course in recommended_courses):
        return True
    if any(skill in blob for skill in skills):
        return True
    if interest and interest in blob:
        return True

    # Allow a few high-quality institutions even if no direct match, but keep the list small.
    return (college.rating or 0) >= 4.5


def _ensure_default_colleges():
    if College.objects.exists():
        return

    for item in DEFAULT_COLLEGES:
        College.objects.create(**item)


def _profile_completion_percent(user, profile, cv_profile):
    checks = [
        bool(getattr(profile, "full_name", "")),
        bool(getattr(profile, "email", "") or getattr(user, "email", "")),
        bool(getattr(profile, "education_level", "")),
        bool(isinstance(getattr(profile, "interests", []), list) and getattr(profile, "interests", [])),
        bool(
            (cv_profile and isinstance(cv_profile.skills, list) and cv_profile.skills)
            or (isinstance(getattr(profile, "skills", []), list) and getattr(profile, "skills", []))
        ),
        bool(getattr(profile, "career_goal", "")),
    ]
    return round((sum(1 for item in checks if item) / len(checks)) * 100)


def _normalize_alert_level(level):
    value = str(level or "").strip().lower()
    if value in {"10", "class 10", "10th"}:
        return "10"
    if value in {"12", "class 12", "12th", "intermediate"}:
        return "12"
    if value in {"ug", "undergraduate", "bachelor", "bachelors"}:
        return "UG"
    if value in {"pg", "postgraduate", "master", "masters"}:
        return "PG"
    return "12"


def _dashboard_alert_queryset(user_level):
    if user_level == "10":
        return Opportunity.objects.filter(level__in=["10", "12"]).order_by("-created_at")
    if user_level == "12":
        return Opportunity.objects.filter(level="12").order_by("-created_at")
    if user_level == "UG":
        return Opportunity.objects.filter(level__in=["UG", "PG"]).order_by("-created_at")
    return Opportunity.objects.filter(level="PG").order_by("-created_at")


def _serialize_dashboard_alert(item):
    deadline_value = item.get("deadline") if isinstance(item, dict) else getattr(item, "deadline", None)
    deadline_display = "To be announced"
    if isinstance(item, dict):
        deadline_display = item.get("deadline_display") or item.get("deadline") or "To be announced"
    elif deadline_value:
        deadline_display = deadline_value.isoformat()

    return {
        "id": item.get("id") if isinstance(item, dict) else item.id,
        "title": item.get("title") if isinstance(item, dict) else item.title,
        "type": item.get("type") if isinstance(item, dict) else item.type,
        "deadline": (item.get("deadline") if isinstance(item, dict) else (deadline_value.isoformat() if deadline_value else None)),
        "deadline_display": deadline_display,
        "link": item.get("link") if isinstance(item, dict) else item.link,
    }


def _dashboard_preferences(user):
    pref, _ = UserPreference.objects.get_or_create(user=user)
    return {
        "internship": bool(pref.internship),
        "job": bool(pref.job),
        "scholarship": bool(pref.scholarship),
        "exam": bool(pref.exam),
    }


def _dashboard_alert_type_enabled(alert_type, pref_map):
    return bool(pref_map.get(str(alert_type or "").strip().lower(), True))


def _get_dashboard_top_alerts(user, profile):
    pref_map = _dashboard_preferences(user)

    cache = UserAlertCache.objects.filter(user=user).first()
    if cache and isinstance(cache.alerts, list) and cache.alerts:
        filtered_cached = [
            item for item in cache.alerts if isinstance(item, dict) and _dashboard_alert_type_enabled(item.get("type"), pref_map)
        ]
        return [_serialize_dashboard_alert(item) for item in filtered_cached[:3]]

    user_level = _normalize_alert_level(getattr(profile, "education_level", "") if profile else "12")
    queryset = [item for item in _dashboard_alert_queryset(user_level) if _dashboard_alert_type_enabled(getattr(item, "type", ""), pref_map)]
    return [_serialize_dashboard_alert(item) for item in queryset[:3]]


def _build_top_career_from_cache(cache):
    if not cache or not isinstance(cache.recommendations, list) or not cache.recommendations:
        return None

    first = cache.recommendations[0]
    if isinstance(first, str):
        return {
            "title": first,
            "reason": "Recommended based on your current profile and test performance.",
        }

    if isinstance(first, dict):
        return {
            "title": first.get("title") or first.get("career") or first.get("name") or "Career Path",
            "reason": first.get("reason") or first.get("description") or "Recommended based on your current profile and test performance.",
            "requiredSkills": first.get("requiredSkills") or first.get("skills") or [],
        }

    return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_dashboard_summary(request):
    user = request.user
    profile = Profile.objects.filter(user=user).first()
    cv_profile = CVProfile.objects.filter(user=user).first()

    quick_test_attempted = TestResult.objects.filter(user=user).exists()
    cache = UserRecommendationCache.objects.filter(user=user).first()

    top_career = _build_top_career_from_cache(cache)
    if not top_career:
        latest_saved = SavedRoadmap.objects.filter(user=user).order_by("-updated_at").first()
        if latest_saved:
            top_career = {
                "title": latest_saved.career_title,
                "reason": "Based on your saved roadmap and ongoing career journey.",
            }

    skill_gap = None
    if top_career:
        skill_gap = get_skill_gap(user, top_career)

    top_alerts = _get_dashboard_top_alerts(user, profile)
    profile_completion = _profile_completion_percent(user, profile, cv_profile)

    completed_steps = 0
    completed_steps += 1 if profile_completion >= 60 else 0
    completed_steps += 1 if quick_test_attempted else 0
    completed_steps += 1 if bool(top_career) else 0
    completed_steps += 1 if bool(top_alerts) else 0
    completed_steps += 1 if SavedRoadmap.objects.filter(user=user).exists() else 0

    return success_response(
        data={
            "top_career": top_career,
            "skill_gap": skill_gap,
            "top_alerts": top_alerts,
            "progress": {
                "completed_steps": completed_steps,
                "total_steps": 5,
                "label": f"Step {completed_steps} of 5 completed",
            },
            "stats": {
                "profile_completion_percent": profile_completion,
                "quick_test_attempted": quick_test_attempted,
                "career_discovered": bool(top_career),
            },
        }
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predict(request):
    user = request.user
    profile = Profile.objects.filter(user=user).first()

    # Get latest test result
    test = TestResult.objects.filter(user=user).order_by('-created_at').first()
    skill_tests = list(SkillTestResult.objects.filter(user=user).order_by('-created_at'))
    latest_skill_test = skill_tests[0] if skill_tests else None

    skill_history = [
        {
            "skill": getattr(item, "skill", "") or "",
            "level": getattr(item, "level", "") or "",
            "score": getattr(item, "score", None),
            "total": getattr(item, "total", None),
        }
        for item in skill_tests
    ]

    strongest_skill_test = None
    if skill_tests:
        strongest_skill_test = max(skill_tests, key=lambda item: ((getattr(item, "score", 0) or 0), getattr(item, "created_at", None)))

    skill_level = getattr(strongest_skill_test, "level", "") or ""
    skill_name = getattr(strongest_skill_test, "skill", "") or ""
    skill_score = getattr(strongest_skill_test, "score", None)
    skill_total = getattr(strongest_skill_test, "total", None)
    skill_signature = json.dumps({
        "history": skill_history,
        "version": RECOMMENDATION_CACHE_VERSION,
    }, sort_keys=True, default=str)

    # Ability
    ability = get_ability_level(test.general_score) if test else "medium"

    # Interest
    interest_data = test.interest_data if test else {}
    if interest_data:
        interest = max(interest_data, key=interest_data.get)
    elif profile and profile.interests:
        first_interest = profile.interests[0]
        interest = first_interest if isinstance(first_interest, str) else "general"
    else:
        interest = "general"

    # Skills (optional)
    try:
        cv = CVProfile.objects.get(user=user)
        skills = cv.skills or []
    except CVProfile.DoesNotExist:
        skills = profile.skills if profile and isinstance(profile.skills, list) else []

    # Recommendations with caching
    cache = UserRecommendationCache.objects.filter(user=user).first()
    
    # Check if cache is valid (same ability, interest, skills, skill_name, skill_level)
    cache_valid = (
        cache and
        cache.ability == ability and
        cache.interest == interest and
        cache.skills == skills and
        cache.skill_signature == skill_signature and
        cache.skill_name == skill_name and
        cache.skill_level == skill_level and
        isinstance(cache.recommendations, list) and
        3 <= len(cache.recommendations) <= 4
    )
    
    if cache_valid:
        recommendations = cache.recommendations
    else:
        # Generate new recommendations using AI
        recommendations = generate_ai_recommendations(
            ability=ability,
            interest=interest,
            skills=skills,
            skill_name=skill_name,
            skill_level=skill_level,
            skill_score=skill_score or 0,
            skill_history=skill_history,
        )
        
        # Update or create cache
        UserRecommendationCache.objects.update_or_create(
            user=user,
            defaults={
                "ability": ability,
                "interest": interest,
                "skills": skills,
                "skill_signature": skill_signature,
                "skill_name": skill_name,
                "skill_level": skill_level,
                "recommendations": recommendations,
            }
        )

    enriched_recommendations = []
    for item in recommendations:
        if not isinstance(item, dict):
            enriched_recommendations.append(item)
            continue

        career_item = dict(item)
        gap = get_skill_gap(user, career_item)
        if gap is not None:
            career_item["skill_gap"] = gap
        career_item["timeline"] = estimate_career_timeline(
            career_data=career_item,
            user_skills=skills,
            ability=ability,
            skill_level=skill_level,
        )
        enriched_recommendations.append(career_item)

    saved_roadmaps = list(
        SavedRoadmap.objects.filter(user=user)
        .values("career_title", "updated_at")
        .order_by("-updated_at")
    )

    return success_response(
        data={
            "ability": ability,
            "interest": interest,
            "skills": skills,
            "skillTest": {
                "skill": getattr(latest_skill_test, "skill", "") or "",
                "level": getattr(latest_skill_test, "level", "") or "",
                "score": getattr(latest_skill_test, "score", None),
                "total": getattr(latest_skill_test, "total", None),
            },
            "skillHistory": skill_history,
            "recommendations": enriched_recommendations,
            "savedRoadmaps": saved_roadmaps,
        }
    )
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_roadmap(request):
    user = request.user
    career = (request.GET.get("career") or "").strip()
    if not career:
        career = "Data Scientist"

    test = TestResult.objects.filter(user=user).order_by('-created_at').first()
    if not test:
        return error_response("No test data found. Please complete the quick test first.", status_code=400)

    ability = get_ability_level(test.general_score)

    try:
        cv_profile = CVProfile.objects.get(user=user)
        skills = cv_profile.skills if isinstance(cv_profile.skills, list) else []
    except CVProfile.DoesNotExist:
        skills = []

    existing_roadmap = SavedRoadmap.objects.filter(
        user=user,
        career_title=career
    ).first()

    if (
        existing_roadmap
        and existing_roadmap.roadmap_data
        and existing_roadmap.ability == ability
        and existing_roadmap.skills == skills
    ):
        roadmap_data = existing_roadmap.roadmap_data
        return success_response(
            data={
                "career": career,
                "ability": ability,
                "skills": skills,
                "steps": roadmap_data.get("steps", []),
                "exams": roadmap_data.get("exams", []),
                "certifications": roadmap_data.get("certifications", []),
                "skillRoadmap": roadmap_data.get("skillRoadmap", []),
                "cached": True,
            }
        )

    try:
        roadmap_data = generate_roadmap(ability, skills, career)
    except Exception:
        roadmap_data = {
            "steps": [],
            "exams": [],
            "certifications": [],
            "skillRoadmap": [],
        }

    SavedRoadmap.objects.update_or_create(
        user=user,
        career_title=career,
        defaults={
            "ability": ability,
            "interest": max(test.interest_data, key=test.interest_data.get) if getattr(test, "interest_data", None) else "",
            "skills": skills,
            "roadmap_data": roadmap_data,
        },
    )

    return success_response(
        data={
            "career": career,
            "ability": ability,
            "skills": skills,
            "steps": roadmap_data.get("steps", []),
            "exams": roadmap_data.get("exams", []),
            "certifications": roadmap_data.get("certifications", []),
            "skillRoadmap": roadmap_data.get("skillRoadmap", []),
            "cached": False,
        }
    )
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_colleges(request):
    user = request.user

    try:
        _ensure_default_colleges()
        user_profile = _build_college_user_profile(user, request)
        user_level = user_profile["user_level"]
        eligible_type = _eligible_college_type(user_level)
        search = (request.GET.get("search") or "").strip().lower()
        location_filter = (request.GET.get("location") or "").strip().lower()
        course_filter = (request.GET.get("course") or "").strip().lower()
        max_fee_filter = user_profile.get("max_fee")
        page = request.GET.get("page") or 1
        page_size = request.GET.get("page_size") or 15

        colleges_qs = College.objects.filter(type=eligible_type)
        if not colleges_qs.exists():
            colleges_qs = College.objects.all()

        if search:
            colleges_qs = colleges_qs.filter(name__icontains=search)
        if location_filter:
            colleges_qs = colleges_qs.filter(location__icontains=location_filter)
        if max_fee_filter is not None:
            colleges_qs = colleges_qs.filter(fees__lte=max_fee_filter)

        candidate_colleges = [
            college
            for college in colleges_qs
            if _is_relevant_college(college, user_profile)
            and (
                not course_filter
                or any(course_filter in str(course).lower() for course in parse_college_courses(college.courses))
            )
        ]
        if not candidate_colleges:
            candidate_colleges = [
                college
                for college in colleges_qs
                if not course_filter
                or any(course_filter in str(course).lower() for course in parse_college_courses(college.courses))
            ]

        ranked = rank_colleges(candidate_colleges, user_profile)

        filter_signature = build_college_filter_signature(
            user_level,
            user_profile["ability"],
            user_profile["interest"],
            user_profile["skills"],
            user_profile["location"],
            user_profile["max_fee"],
            user_profile["course_override"],
            search,
        )

        skills_signature = _skills_signature(user_profile["skills"])
        cache = (
            CollegeRecommendationCache.objects.filter(
                user=user,
                user_level=user_level,
                ability=user_profile["ability"],
                interest=user_profile["interest"],
                skills_signature=skills_signature,
                filter_signature=filter_signature,
            )
            .order_by("-updated_at")
            .first()
        )
        cache_valid = bool(
            cache
            and isinstance(cache.highlighted_colleges, list)
            and 3 <= len(cache.highlighted_colleges) <= 5
        )

        if cache_valid:
            highlighted = cache.highlighted_colleges
        else:
            highlighted = generate_ai_college_highlights(user_profile, ranked[:20])
            CollegeRecommendationCache.objects.create(
                user=user,
                user_level=user_level,
                ability=user_profile["ability"],
                interest=user_profile["interest"],
                skills_signature=skills_signature,
                filter_signature=filter_signature,
                recommended_courses=user_profile["recommended_courses"],
                highlighted_colleges=highlighted,
            )

        page_data = paginate_items(ranked, page=page, page_size=page_size)

        return success_response(
            data={
                "recommended": highlighted,
                "colleges": page_data["items"],
                "user_level": user_level,
                "recommended_courses": user_profile["recommended_courses"],
                "eligible_type": eligible_type,
                "pagination": {
                    "page": page_data["page"],
                    "page_size": page_data["page_size"],
                    "total_count": page_data["total_count"],
                    "total_pages": page_data["total_pages"],
                    "has_next": page_data["has_next"],
                    "has_previous": page_data["has_previous"],
                },
            }
        )
    except Exception as exc:
        logger.exception("College finder failed: %s", exc)
        return error_response(
            "College finder failed",
            data={
                "recommended": [],
                "colleges": [],
                "user_level": "12",
                "recommended_courses": get_recommended_courses("12", "general"),
                "pagination": {
                    "page": 1,
                    "page_size": 15,
                    "total_count": 0,
                    "total_pages": 1,
                    "has_next": False,
                    "has_previous": False,
                },
            },
            status_code=200,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_college_details(request):
    user = request.user
    college_name = (request.GET.get("name") or "").strip()

    _ensure_default_colleges()

    if not college_name:
        return error_response("College name required", status_code=400)

    college = College.objects.filter(name__iexact=college_name).first()
    if not college:
        return error_response("College not found", status_code=404)

    user_profile = _build_college_user_profile(user, request)
    ability = user_profile["ability"]
    interest = user_profile["interest"]
    skills = user_profile["skills"]
    skills_signature = _skills_signature(skills)

    insight_cache = (
        CollegeDetailsInsightCache.objects.filter(
            user=user,
            college=college,
            ability=ability,
            interest=interest,
            skills_signature=skills_signature,
        )
        .order_by("-updated_at")
        .first()
    )

    if insight_cache and insight_cache.explanation:
        return success_response(
            data={
                "name": college.name,
                "location": college.location,
                "courses": ", ".join(college.courses) if isinstance(college.courses, list) else str(college.courses),
                "fees": college.fees,
                "apply_link": college.apply_link,
                "explanation": insight_cache.explanation,
                "decision_feedback": insight_cache.decision_feedback or {},
                "cached": True,
            }
        )

    # AI explanation
    from .college_utils import generate_college_explanation
    from .utils import generate_ai_college_feedback

    explanation = generate_college_explanation(
        {
            "name": college.name,
            "location": college.location,
            "courses": ", ".join(college.courses) if isinstance(college.courses, list) else str(college.courses),
            "fees": college.fees,
        },
        ability,
        skills,
        interest
    )

    decision_feedback = generate_ai_college_feedback(
        {
            "name": college.name,
            "location": college.location,
            "courses": college.courses,
            "fees": college.fees,
            "rating": college.rating,
        },
        user_profile,
    )

    CollegeDetailsInsightCache.objects.update_or_create(
        user=user,
        college=college,
        ability=ability,
        interest=interest,
        skills_signature=skills_signature,
        defaults={
            "explanation": explanation,
            "decision_feedback": decision_feedback,
        },
    )

    return success_response(
        data={
            "name": college.name,
            "location": college.location,
            "courses": ", ".join(college.courses) if isinstance(college.courses, list) else str(college.courses),
            "fees": college.fees,
            "apply_link": college.apply_link,
            "explanation": explanation,
            "decision_feedback": decision_feedback,
            "cached": False,
        }
    )