from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from test_module.models import TestResult, SkillTestResult
from cv_module.models import CVProfile
from accounts.models import Profile
from .models import SavedRoadmap, UserRecommendationCache
from .roadmap_utils import generate_roadmap
from .utils import get_ability_level, generate_ai_recommendations
import logging
import json

logger = logging.getLogger(__name__)


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
    skill_signature = json.dumps(skill_history, sort_keys=True, default=str)

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
        cache.skill_level == skill_level
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
