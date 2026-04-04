from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from test_module.models import TestResult, SkillTestResult
from cv_module.models import CVProfile
from accounts.models import Profile
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
RECOMMENDATION_CACHE_VERSION = "v3_top_3_4"

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

    saved_roadmaps = list(
        SavedRoadmap.objects.filter(user=user)
        .values("career_title", "updated_at")
        .order_by("-updated_at")
    )

    return Response({
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
        "recommendations": recommendations,
        "savedRoadmaps": saved_roadmaps,
    })
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_roadmap(request):
    user = request.user
    career = (request.GET.get("career") or "").strip()
    if not career:
        career = "Data Scientist"

    test = TestResult.objects.filter(user=user).order_by('-created_at').first()
    if not test:
        return Response({"error": "No test data found. Please complete the quick test first."}, status=400)

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
        return Response({
            "career": career,
            "ability": ability,
            "skills": skills,
            "steps": roadmap_data.get("steps", []),
            "exams": roadmap_data.get("exams", []),
            "certifications": roadmap_data.get("certifications", []),
            "skillRoadmap": roadmap_data.get("skillRoadmap", []),
            "cached": True,
        })

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

    return Response({
        "career": career,
        "ability": ability,
        "skills": skills,
        "steps": roadmap_data.get("steps", []),
        "exams": roadmap_data.get("exams", []),
        "certifications": roadmap_data.get("certifications", []),
        "skillRoadmap": roadmap_data.get("skillRoadmap", []),
        "cached": False,
    })
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

        return Response(
            {
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
        return Response(
            {
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
            status=200,
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_college_details(request):
    user = request.user
    college_name = (request.GET.get("name") or "").strip()

    _ensure_default_colleges()

    if not college_name:
        return Response({"error": "College name required"}, status=400)

    college = College.objects.filter(name__iexact=college_name).first()
    if not college:
        return Response({"error": "College not found"}, status=404)

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
        return Response({
            "name": college.name,
            "location": college.location,
            "courses": ", ".join(college.courses) if isinstance(college.courses, list) else str(college.courses),
            "fees": college.fees,
            "apply_link": college.apply_link,
            "explanation": insight_cache.explanation,
            "decision_feedback": insight_cache.decision_feedback or {},
            "cached": True,
        })

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

    return Response({
        "name": college.name,
        "location": college.location,
        "courses": ", ".join(college.courses) if isinstance(college.courses, list) else str(college.courses),
        "fees": college.fees,
        "apply_link": college.apply_link,
        "explanation": explanation,
        "decision_feedback": decision_feedback,
        "cached": False,
    })