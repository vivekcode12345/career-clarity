from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.conf import settings
from django.core.mail import send_mail
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from datetime import datetime, timezone, timedelta
from django.utils import timezone as django_timezone
import logging
import re
import requests
import secrets
from core.api_response import success_response, error_response

from .models import Profile, TokenBlacklist, UserPreference, EmailOTP


logger = logging.getLogger(__name__)

def _is_valid_email(email):
    try:
        validate_email(email)
        return True
    except ValidationError:
        return False


def _get_password_validation_error(password):
    candidate = password or ""

    if len(candidate) < 8:
        return "Please use password that is more than 8 digit."

    missing_rules = []
    if not re.search(r"[A-Z]", candidate):
        missing_rules.append("one uppercase letter")
    if not re.search(r"[a-z]", candidate):
        missing_rules.append("one lowercase letter")
    if not re.search(r"\d", candidate):
        missing_rules.append("one number")
    if not re.search(r"[^A-Za-z0-9]", candidate):
        missing_rules.append("one special character")

    if missing_rules:
        return f"Password is missing: {', '.join(missing_rules)}."

    return ""


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


def _is_profile_complete(profile):
    has_name = bool(profile.full_name and profile.full_name.strip() and profile.full_name != profile.user.username)
    has_education = bool((profile.education_level or "").strip())
    has_interests = bool(isinstance(profile.interests, list) and len(profile.interests) > 0)
    return has_name and has_education and has_interests


def _generate_unique_username(base_value):
    base = re.sub(r"[^a-zA-Z0-9_]", "", (base_value or "googleuser")).strip().lower()[:20]
    if not base:
        base = "googleuser"

    candidate = base
    counter = 1
    while User.objects.filter(username=candidate).exists():
        suffix = str(counter)
        candidate = f"{base[: max(1, 20 - len(suffix))]}{suffix}"
        counter += 1
    return candidate


def _generate_otp_code():
    return f"{secrets.randbelow(1000000):06d}"


def _send_otp_email(email, purpose, otp_code):
    purpose_label = "Email verification" if purpose == EmailOTP.PURPOSE_REGISTER else "Password change verification"
    subject = f"CareerClarity {purpose_label} OTP"
    message = (
        f"Your CareerClarity OTP is {otp_code}.\n\n"
        f"This code is valid for 10 minutes.\n"
        f"If you did not request this, ignore this email."
    )
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[email],
            fail_silently=False,
        )
    except Exception as e:
        logger.warning("Failed to send OTP email to %s: %s", email, str(e))
        # Continue without raising - OTP is stored in database regardless


def _store_otp(email, purpose, user=None, payload=None):
    otp_code = _generate_otp_code()
    EmailOTP.objects.filter(email__iexact=email, purpose=purpose, verified=False).delete()
    record = EmailOTP.objects.create(
        user=user,
        email=email,
        purpose=purpose,
        otp_code=otp_code,
        expires_at=django_timezone.now() + timedelta(minutes=10),
        payload=payload or {},
    )
    _send_otp_email(email, purpose, otp_code)
    return record


def _consume_otp(email, purpose, otp_code):
    record = (
        EmailOTP.objects.filter(
            email__iexact=email,
            purpose=purpose,
            otp_code=str(otp_code).strip(),
            verified=False,
        )
        .order_by("-created_at")
        .first()
    )
    if not record:
        return None, "Invalid OTP"

    if record.expires_at < django_timezone.now():
        return None, "OTP expired"

    record.verified = True
    record.save(update_fields=["verified"])
    return record, ""


@api_view(["POST"])
def register(request):
    email = (request.data.get("email") or "").strip().lower()
    username = (request.data.get("username") or email or "").strip()
    password = request.data.get("password") or ""
    confirm_password = request.data.get("confirmPassword") or request.data.get("confirm_password") or ""
    name = (request.data.get("name") or username).strip()
    education_level = (request.data.get("educationLevel") or "").strip()
    logger.info("Registration requested for email=%s", email or "<empty>")

    if not email or not password or not confirm_password:
        logger.warning("Registration failed due to missing required fields for email=%s", email or "<empty>")
        return error_response("Email, password and confirm password are required", status_code=status.HTTP_400_BAD_REQUEST)

    if not _is_valid_email(email):
        logger.warning("Registration failed due to invalid email format: email=%s", email)
        return error_response("Please enter a valid email address", status_code=status.HTTP_400_BAD_REQUEST)

    password_error = _get_password_validation_error(password)
    if password_error:
        logger.warning("Registration failed due to weak password for email=%s", email)
        return error_response(password_error, status_code=status.HTTP_400_BAD_REQUEST)

    if password != confirm_password:
        logger.warning("Registration failed due to password mismatch for email=%s", email)
        return error_response("Password and confirm password do not match", status_code=status.HTTP_400_BAD_REQUEST)

    existing_active_user = User.objects.filter(email__iexact=email, is_active=True).first()
    if existing_active_user:
        logger.warning("Registration failed because email already exists and is active: email=%s", email)
        return error_response("User already exists", status_code=status.HTTP_400_BAD_REQUEST)

    verified_registration_otp = (
        EmailOTP.objects.filter(
            email__iexact=email,
            purpose=EmailOTP.PURPOSE_REGISTER,
            verified=True,
            expires_at__gte=django_timezone.now(),
        )
        .order_by("-created_at")
        .first()
    )
    if not verified_registration_otp:
        return error_response("Please verify your email before signing up.", status_code=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exclude(email__iexact=email).exists():
        logger.warning("Registration failed because user already exists: username=%s", username)
        return error_response("User already exists", status_code=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        user = User.objects.create_user(username=username, password=password, email=email, is_active=True)
    else:
        user.username = username
        user.email = email
        user.is_active = True
        user.set_password(password)
        user.save(update_fields=["username", "email", "is_active", "password"])

    profile, _ = Profile.objects.get_or_create(
        user=user,
        defaults={
            "full_name": name or username,
            "email": email,
            "education_level": education_level,
        },
    )
    profile.full_name = name or profile.full_name or username
    profile.email = email
    profile.education_level = education_level
    profile.save()

    EmailOTP.objects.filter(email__iexact=email, purpose=EmailOTP.PURPOSE_REGISTER).delete()

    refresh = RefreshToken.for_user(user)

    return success_response(
        data={
            "token": str(refresh.access_token),
            "refreshToken": str(refresh),
            "user": {
                "username": user.username,
                **_serialize_profile(profile),
            },
            "requiresEmailVerification": False,
            "requiresProfileCompletion": not _is_profile_complete(profile),
            "isNewUser": True,
        },
        message="User created successfully",
        status_code=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def send_registration_otp(request):
    email = (request.data.get("email") or "").strip().lower()
    if not email:
        return error_response("Email is required", status_code=status.HTTP_400_BAD_REQUEST)

    if not _is_valid_email(email):
        return error_response("Please enter a valid email address", status_code=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email__iexact=email, is_active=True).exists():
        return error_response("User already exists", status_code=status.HTTP_400_BAD_REQUEST)

    _store_otp(email=email, purpose=EmailOTP.PURPOSE_REGISTER)
    return success_response(
        data={"email": email, "otpSent": True},
        message="OTP sent to your email.",
    )


@api_view(["POST"])
def verify_registration_otp(request):
    email = (request.data.get("email") or "").strip().lower()
    otp = (request.data.get("otp") or request.data.get("code") or "").strip()

    if not email or not otp:
        return error_response("Email and OTP are required", status_code=status.HTTP_400_BAD_REQUEST)

    if not _is_valid_email(email):
        return error_response("Please enter a valid email address", status_code=status.HTTP_400_BAD_REQUEST)

    record, otp_error = _consume_otp(email, EmailOTP.PURPOSE_REGISTER, otp)
    if not record:
        return error_response(otp_error, status_code=status.HTTP_400_BAD_REQUEST)

    return success_response(
        data={"email": email, "verified": True},
        message="Email verified successfully.",
    )


@api_view(["POST"])
def login(request):
    identifier = (request.data.get("identifier") or request.data.get("username") or request.data.get("email") or "").strip()
    password = request.data.get("password") or ""
    logger.info("Login requested for identifier=%s", identifier or "<empty>")

    if not identifier or not password:
        logger.warning("Login failed due to missing credentials for identifier=%s", identifier or "<empty>")
        return error_response("Username/email and password are required", status_code=status.HTTP_400_BAD_REQUEST)

    if "@" in identifier:
        account = User.objects.filter(email__iexact=identifier).first()
    else:
        account = User.objects.filter(username=identifier).first()

    if account is None:
        logger.warning("Login failed because account not found: identifier=%s", identifier)
        return error_response("Invalid credentials", status_code=status.HTTP_401_UNAUTHORIZED)

    if not account.is_active:
        return error_response("Please verify your email before logging in.", status_code=status.HTTP_401_UNAUTHORIZED)

    user = authenticate(username=account.username, password=password)

    if user is None:
        logger.warning("Login failed for identifier=%s", identifier or "<empty>")
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
            "requiresProfileCompletion": not _is_profile_complete(profile),
            "isNewUser": False,
        }
    )


@api_view(["GET"])
def google_auth_config(request):
    return success_response(
        data={
            "googleClientId": settings.GOOGLE_CLIENT_ID,
            "configured": bool(settings.GOOGLE_CLIENT_ID),
        }
    )


@api_view(["POST"])
def google_auth(request):
    credential = (request.data.get("credential") or request.data.get("idToken") or "").strip()
    access_token = (request.data.get("accessToken") or request.data.get("access_token") or "").strip()
    if not credential and not access_token:
        return error_response("Google credential is required", status_code=status.HTTP_400_BAD_REQUEST)

    if not settings.GOOGLE_CLIENT_ID:
        logger.error("Google login failed: GOOGLE_CLIENT_ID is not configured")
        return error_response("Google login is not configured", status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)

    id_info = None

    if access_token:
        try:
            token_info_response = requests.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"access_token": access_token},
                timeout=8,
            )
            token_info_response.raise_for_status()
            token_info = token_info_response.json() or {}

            token_audience = (token_info.get("aud") or token_info.get("azp") or "").strip()
            if token_audience != settings.GOOGLE_CLIENT_ID:
                return error_response(
                    "Google token audience mismatch. Ensure frontend and backend use the same Google client ID.",
                    status_code=status.HTTP_401_UNAUTHORIZED,
                )

            email = (token_info.get("email") or "").strip().lower()
            id_info = {
                "iss": "https://accounts.google.com",
                "email": email,
                "email_verified": str(token_info.get("email_verified", "")).lower() in {"true", "1"},
                "name": token_info.get("name") or "",
                "given_name": token_info.get("given_name") or "",
            }

            if not id_info["name"]:
                try:
                    userinfo_response = requests.get(
                        "https://www.googleapis.com/oauth2/v3/userinfo",
                        headers={"Authorization": f"Bearer {access_token}"},
                        timeout=8,
                    )
                    if userinfo_response.ok:
                        userinfo = userinfo_response.json() or {}
                        id_info["name"] = (userinfo.get("name") or "").strip()
                        id_info["given_name"] = (userinfo.get("given_name") or "").strip()
                        if not id_info["email"]:
                            id_info["email"] = (userinfo.get("email") or "").strip().lower()
                        if userinfo.get("email_verified") is True:
                            id_info["email_verified"] = True
                except Exception:
                    logger.warning("Google userinfo fetch failed", exc_info=True)
        except Exception:
            logger.warning("Google login failed: invalid access token", exc_info=True)
            return error_response("Invalid Google token", status_code=status.HTTP_401_UNAUTHORIZED)
    else:
        try:
            token_info_response = requests.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": credential},
                timeout=8,
            )
            token_info_response.raise_for_status()
            token_info = token_info_response.json() or {}
            token_audience = (token_info.get("aud") or "").strip()
            if token_audience != settings.GOOGLE_CLIENT_ID:
                return error_response(
                    "Google token audience mismatch. Ensure frontend and backend use the same Google client ID.",
                    status_code=status.HTTP_401_UNAUTHORIZED,
                )

            id_info = {
                "iss": token_info.get("iss") or "https://accounts.google.com",
                "email": (token_info.get("email") or "").strip().lower(),
                "email_verified": str(token_info.get("email_verified", "")).lower() in {"true", "1"},
                "name": (token_info.get("name") or "").strip(),
                "given_name": (token_info.get("given_name") or "").strip(),
            }
        except Exception:
            logger.warning("Google login failed: invalid ID token", exc_info=True)
            return error_response("Invalid Google token", status_code=status.HTTP_401_UNAUTHORIZED)

    issuer = id_info.get("iss", "")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        return error_response("Invalid token issuer", status_code=status.HTTP_401_UNAUTHORIZED)

    email = (id_info.get("email") or "").strip().lower()
    if not email:
        return error_response("Google account email not available", status_code=status.HTTP_400_BAD_REQUEST)

    if id_info.get("email_verified") is not True:
        return error_response("Google account email is not verified", status_code=status.HTTP_400_BAD_REQUEST)

    display_name = (id_info.get("name") or id_info.get("given_name") or email.split("@")[0]).strip()
    user = User.objects.filter(email__iexact=email).first()
    is_new_user = False

    if user is None:
        username = _generate_unique_username(email.split("@")[0])
        user = User.objects.create_user(username=username, email=email)
        user.set_unusable_password()
        user.save(update_fields=["password"])
        is_new_user = True

    if not (user.email or "").strip():
        user.email = email
        user.save(update_fields=["email"])

    profile, _ = Profile.objects.get_or_create(
        user=user,
        defaults={
            "full_name": display_name or user.username,
            "email": email,
            "education_level": "",
            "interests": [],
        },
    )

    profile_changed = False
    if not (profile.full_name or "").strip() and display_name:
        profile.full_name = display_name
        profile_changed = True
    if not (profile.email or "").strip():
        profile.email = email
        profile_changed = True
    if profile.education_level is None:
        profile.education_level = ""
        profile_changed = True
    if profile_changed:
        profile.save()

    refresh = RefreshToken.for_user(user)
    return success_response(
        data={
            "token": str(refresh.access_token),
            "refreshToken": str(refresh),
            "user": {
                "username": user.username,
                **_serialize_profile(profile),
            },
            "requiresProfileCompletion": not _is_profile_complete(profile),
            "isNewUser": is_new_user,
        },
        message="Google login successful",
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
    otp = (request.data.get("otp") or request.data.get("code") or "").strip()

    if not current_password or not new_password:
        return error_response("Current and new password are required.", status_code=status.HTTP_400_BAD_REQUEST)

    if len(str(new_password)) < 6:
        return error_response("New password must be at least 6 characters.", status_code=status.HTTP_400_BAD_REQUEST)

    user = request.user
    if not user.check_password(current_password):
        return error_response("Current password is incorrect.", status_code=status.HTTP_400_BAD_REQUEST)

    email = (user.email or "").strip().lower()
    if not email:
        return error_response("No email found for this account.", status_code=status.HTTP_400_BAD_REQUEST)

    if not otp:
        _store_otp(
            email=email,
            purpose=EmailOTP.PURPOSE_PASSWORD_CHANGE,
            user=user,
            payload={"requested_by": user.username},
        )
        return success_response(
            data={
                "requiresOtp": True,
                "email": email,
            },
            message="OTP sent to your email. Enter it to confirm password change.",
        )

    otp_record, otp_error = _consume_otp(email, EmailOTP.PURPOSE_PASSWORD_CHANGE, otp)
    if not otp_record:
        return error_response(otp_error, status_code=status.HTTP_400_BAD_REQUEST)

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