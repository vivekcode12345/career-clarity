from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from datetime import datetime, timezone

from .models import Profile, TokenBlacklist


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

    if not username or not password:
        return Response({"error": "Username and password are required"}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({"error": "User already exists"}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.create_user(username=username, password=password, email=email)

    profile = Profile.objects.create(
        user=user,
        full_name=name or username,
        email=email,
        education_level=education_level,
    )

    refresh = RefreshToken.for_user(user)

    return Response(
        {
            "message": "User created successfully",
            "token": str(refresh.access_token),
            "refreshToken": str(refresh),
            "user": {
                "username": user.username,
                **_serialize_profile(profile),
            },
        },
        status=status.HTTP_201_CREATED,
    )


@api_view(["POST"])
def login(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)

    if user is None:
        return Response({"error": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

    profile, _ = Profile.objects.get_or_create(
        user=user,
        defaults={
            "full_name": user.username,
            "email": user.email or "",
            "education_level": "Class 12",
        },
    )

    refresh = RefreshToken.for_user(user)

    return Response(
        {
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
        return Response(_serialize_profile(profile))

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

    return Response({"message": "Profile updated", "user": _serialize_profile(profile)})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout(request):
    """Logout endpoint - blacklist the refresh token"""
    try:
        refresh_token = request.data.get("refreshToken")
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
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
            return Response(
                {"error": f"Invalid token: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response(
            {"message": "Successfully logged out"},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {"error": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )