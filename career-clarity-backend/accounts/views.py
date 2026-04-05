from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from datetime import datetime, timezone
import logging
from core.api_response import success_response, error_response

from .models import Profile, TokenBlacklist, UserPreference


logger = logging.getLogger(__name__)


def _serialize_profile(profile):
    # Ensure name is always populated (handle existing users with empty full_name)
    name = profile.full_name or profile.user.username or "Student"
    
    return {
        "name": name,
        "email": profile.email,
        "educationLevel": profile.education_level,
        "interests": profile.interests,
        "skills": profile.skills,
        "preferredLocation": profile.preferred_location,
        "careerGoal": profile.career_goal,
    }


@api_view(["POST"])
def register(request):
    username = (request.data.get("username") or "").strip()
    password = request.data.get("password")
    name = (request.data.get("name") or username).strip()
    email = (request.data.get("email") or "").strip()
    education_level = (request.data.get("educationLevel") or "Class 12").strip()
    logger.info("Registration requested for username=%s", username or "<empty>")

    if not username or not password:
        logger.warning("Registration failed due to missing credentials for username=%s", username or "<empty>")
        return error_response("Username and password are required", status_code=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        logger.warning("Registration failed because user already exists: username=%s", username)
        return error_response("User already exists", status_code=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password, email=email)

    profile = Profile.objects.create(
        user=user,
        full_name=name or username,
        email=email,
        education_level=education_level,
    )

    refresh = RefreshToken.for_user(user)
    logger.info("Registration successful for user_id=%s username=%s", user.id, user.username)

    return success_response(
        data={
            "token": str(refresh.access_token),
            "refreshToken": str(refresh),
            "user": {
                "username": user.username,
                **_serialize_profile(profile),
            },
        },
        message="User created successfully",
        status_code=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")
    logger.info("Login requested for username=%s", username or "<empty>")

    user = authenticate(username=username, password=password)

    if user is None:
        logger.warning("Login failed for username=%s", username or "<empty>")
        return error_response("Invalid credentials", status_code=status.HTTP_401_UNAUTHORIZED)

    profile, _ = Profile.objects.get_or_create(
        user=user,
        defaults={
            "full_name": user.username,
            "email": user.email or "",
            "education_level": "Class 12",
        },
    )

    refresh = RefreshToken.for_user(user)
    logger.info("Login successful for user_id=%s username=%s", user.id, user.username)

    return success_response(
        data={
            "token": str(refresh.access_token),
            "refreshToken": str(refresh),
            "user": {
                "username": user.username,
                **_serialize_profile(profile),
            },
        }
    )


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def get_profile(request):
    profile, _ = Profile.objects.get_or_create(
        user=request.user,
        defaults={
            "full_name": request.user.username,
            "email": request.user.email or "",
            "education_level": "Class 12",
        },
    )

    if request.method == "GET":
        return success_response(data=_serialize_profile(profile))

    data = request.data
    profile.full_name = data.get("name", profile.full_name)
    profile.email = data.get("email", profile.email)
    profile.education_level = data.get("educationLevel", profile.education_level)
    profile.interests = data.get("interests", profile.interests)

    incoming_skills = data.get("skills", profile.skills)
    if isinstance(incoming_skills, str):
        profile.skills = [item.strip() for item in incoming_skills.split(",") if item.strip()]
    elif isinstance(incoming_skills, list):
        profile.skills = [str(item).strip() for item in incoming_skills if str(item).strip()]
    else:
        profile.skills = profile.skills

    profile.preferred_location = data.get("preferredLocation", profile.preferred_location)
    profile.career_goal = data.get("careerGoal", profile.career_goal)
    profile.save()

    return success_response(data={"user": _serialize_profile(profile)}, message="Profile updated")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout endpoint - blacklist the refresh token"""
    logger.info("Logout requested for user_id=%s", request.user.id)
    try:
        refresh_token = request.data.get("refreshToken")
        if not refresh_token:
            logger.warning("Logout failed due to missing refresh token for user_id=%s", request.user.id)
            return error_response("Refresh token is required", status_code=status.HTTP_400_BAD_REQUEST)
        
        try:
            refresh = RefreshToken(refresh_token)
            exp_timestamp = refresh.get("exp")
            if exp_timestamp:
                refresh_expires_at = datetime.fromtimestamp(exp_timestamp, tz=timezone.utc)
                TokenBlacklist.objects.get_or_create(
                    token=refresh_token,
                    defaults={"expires_at": refresh_expires_at}
                )

            auth_header = request.headers.get("Authorization", "")
            if auth_header.startswith("Bearer "):
                access_token = auth_header.split(" ", 1)[1].strip()
                try:
                    access = AccessToken(access_token)
                    access_exp = access.get("exp")
                    if access_exp:
                        access_expires_at = datetime.fromtimestamp(access_exp, tz=timezone.utc)
                        TokenBlacklist.objects.get_or_create(
                            token=access_token,
                            defaults={"expires_at": access_expires_at}
                        )
                except TokenError:
                    pass
        except Exception as e:
            logger.warning("Logout failed due to invalid token for user_id=%s", request.user.id, exc_info=True)
            return error_response(f"Invalid token: {str(e)}", status_code=status.HTTP_400_BAD_REQUEST)

        logger.info("Logout successful for user_id=%s", request.user.id)
        return success_response(message="Successfully logged out", status_code=status.HTTP_200_OK)
    except Exception as e:
        logger.error("Unexpected logout error for user_id=%s", request.user.id, exc_info=True)
        return error_response(str(e), status_code=status.HTTP_400_BAD_REQUEST)


def _serialize_preferences(preferences):
    return {
        "internship": bool(preferences.internship),
        "job": bool(preferences.job),
        "scholarship": bool(preferences.scholarship),
        "exam": bool(preferences.exam),
    }


@api_view(["GET", "PUT"])
@permission_classes([IsAuthenticated])
def preferences_api(request):
    preferences, _ = UserPreference.objects.get_or_create(user=request.user)

    if request.method == "GET":
        return success_response(data=_serialize_preferences(preferences))

    payload = request.data or {}
    for key in ["internship", "job", "scholarship", "exam"]:
        if key in payload:
            setattr(preferences, key, bool(payload.get(key)))
    preferences.save()
    return success_response(
        data={"preferences": _serialize_preferences(preferences)},
        message="Preferences updated",
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def change_password_api(request):
    current_password = request.data.get("current_password")
    new_password = request.data.get("new_password")

    if not current_password or not new_password:
        return error_response("Current and new password are required.", status_code=status.HTTP_400_BAD_REQUEST)

    if len(str(new_password)) < 6:
        return error_response("New password must be at least 6 characters.", status_code=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not user.check_password(current_password):
        return error_response("Current password is incorrect.", status_code=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=["password"])
    return success_response(message="Password changed successfully.")


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reset_tests_api(request):
    from test_module.models import TestResult, SkillTestResult

    quick_deleted, _ = TestResult.objects.filter(user=request.user).delete()
    skill_deleted, _ = SkillTestResult.objects.filter(user=request.user).delete()

    return success_response(
        data={
            "deleted": {
                "quick_test_records": quick_deleted,
                "skill_test_records": skill_deleted,
            },
        },
        message="Test data reset successfully.",
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reset_recommendations_api(request):
    from prediction_module.models import (
        UserRecommendationCache,
        SavedRoadmap,
        CollegeRecommendationCache,
        CollegeDetailsInsightCache,
    )

    rec_deleted, _ = UserRecommendationCache.objects.filter(user=request.user).delete()
    roadmap_deleted, _ = SavedRoadmap.objects.filter(user=request.user).delete()
    college_rec_deleted, _ = CollegeRecommendationCache.objects.filter(user=request.user).delete()
    college_detail_deleted, _ = CollegeDetailsInsightCache.objects.filter(user=request.user).delete()

    return success_response(
        data={
            "deleted": {
                "recommendation_cache": rec_deleted,
                "saved_roadmaps": roadmap_deleted,
                "college_recommendation_cache": college_rec_deleted,
                "college_detail_cache": college_detail_deleted,
            },
        },
        message="Recommendation data reset successfully.",
    )