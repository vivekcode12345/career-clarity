from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import CVProfile
from .utils import extract_text_from_pdf, extract_text_from_image, parse_cv
from accounts.models import Profile
from test_module.models import TestResult
from .chat_utils import extract_subjects, is_school_student, has_no_cv_intent, extract_high_marks_subjects


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile_completion_status(request):
    """
    Check if user's profile is complete (has name, interests filled).
    Returns: { "is_complete": bool, "missing_fields": list }
    """
    user = request.user
    try:
        profile = Profile.objects.get(user=user)
    except Profile.DoesNotExist:
        return Response({
            "is_complete": False,
            "missing_fields": ["name", "interests"],
            "message": "Please complete your profile to proceed."
        })

    missing_fields = []
    if not profile.full_name or profile.full_name == user.username:
        missing_fields.append("name")
    
    if not profile.interests or len(profile.interests) == 0:
        missing_fields.append("interests")

    is_complete = len(missing_fields) == 0

    return Response({
        "is_complete": is_complete,
        "missing_fields": missing_fields,
        "profile": {
            "full_name": profile.full_name,
            "education_level": profile.education_level,
            "interests": profile.interests or [],
            "skills": profile.skills or [],
        } if is_complete else None
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_profile_interests(request):
    """
    Update profile with interests, skills, and other details.
    Request body: { "full_name": str, "interests": list, "custom_interests": list, "skills": list }
    """
    user = request.user
    data = request.data

    profile, _ = Profile.objects.get_or_create(
        user=user,
        defaults={
            "full_name": user.username,
            "email": user.email or "",
            "education_level": "Class 12",
        }
    )

    # Update full name if provided
    if data.get("full_name"):
        profile.full_name = data["full_name"]

    # Combine predefined interests + custom interests
    interests = data.get("interests", [])
    custom_interests = data.get("custom_interests", [])

    if isinstance(interests, str):
        interests = [item.strip() for item in interests.split(",") if item.strip()]
    elif not isinstance(interests, list):
        interests = []

    if isinstance(custom_interests, str):
        custom_interests = [item.strip() for item in custom_interests.split(",") if item.strip()]
    elif not isinstance(custom_interests, list):
        custom_interests = []

    all_interests = list(dict.fromkeys(interests + custom_interests))
    profile.interests = all_interests

    # Update skills if provided
    if data.get("skills"):
        skills = data.get("skills", [])
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(",") if s.strip()]
        elif not isinstance(skills, list):
            skills = []
        profile.skills = skills

    profile.save()

    return Response({
        "success": True,
        "message": "Profile updated successfully.",
        "profile": {
            "full_name": profile.full_name,
            "interests": profile.interests,
            "skills": profile.skills,
        }
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_cv(request):
    file = request.FILES.get('cv')

    if not file:
        return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

    filename = file.name.lower()
    allowed_exts = ['.pdf', '.jpg', '.jpeg', '.png']
    if not any(filename.endswith(ext) for ext in allowed_exts):
        return Response({"error": "Only PDF or Image files (.jpg, .jpeg, .png) allowed"}, status=status.HTTP_400_BAD_REQUEST)

    if file.size > 10 * 1024 * 1024: # Increased to 10MB for images
        return Response({"error": "File too large (max 10MB)"}, status=status.HTTP_400_BAD_REQUEST)

    file.seek(0)
    try:
        if filename.endswith('.pdf'):
            text = extract_text_from_pdf(file)
        else:
            text = extract_text_from_image(file)
    except Exception as e:
        return Response({"error": f"Failed to process file: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
    
    profile, _ = Profile.objects.get_or_create(
        user=request.user,
        defaults={
            "full_name": request.user.username,
            "email": request.user.email or "",
            "education_level": "Class 12",
        },
    )

    school_student = is_school_student(profile.education_level)

    # Dedicated marks-card flow for school students (no CV parser dependency).
    if school_student:
        strongest_subjects = extract_high_marks_subjects(text)
        effective_skills = strongest_subjects if strongest_subjects else extract_subjects(text)[:3]
    else:
        strongest_subjects = []
        data = parse_cv(text)
        effective_skills = data.get("skills", [])

    if school_student and effective_skills:
        existing_interests = profile.interests if isinstance(profile.interests, list) else []
        profile.interests = list(dict.fromkeys(existing_interests + effective_skills))

    CVProfile.objects.update_or_create(
        user=request.user,
        defaults={
            "skills": effective_skills,
            "full_text": text,
        }
    )

    profile.skills = effective_skills
    profile.save()

    upload_kind = "marks card" if school_student else "CV"
    if effective_skills:
        success_message = f"{upload_kind.title()} uploaded successfully. Strongest subjects/skills extracted."
    else:
        success_message = f"{upload_kind.title()} uploaded successfully, but no clear skills were detected."

    return Response({
        "success": True,
        "message": success_message,
        "skills": effective_skills,
        "strongest_subjects": strongest_subjects if school_student else [],
    })

@api_view(['GET'])
def api_home(request):
    return Response({
        "message": "Welcome to the SIH CV Module API",
        "endpoints": {
            "Upload CV": "/upload-cv/ [POST]",
            "Get CV Data": "/cv-data/ [GET]",
            "Get Token": "/api/token/ [POST]",
            "Refresh Token": "/api/token/refresh/ [POST]"
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_cv_data(request):
    try:
        profile = CVProfile.objects.get(user=request.user)
    except CVProfile.DoesNotExist:
        return Response({"error": "CV not uploaded"}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        "skills": profile.skills
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile_with_skills(request):
    """
    Get current user's profile including education level, skills, and interests.
    This helps frontend verify what skills the user has.
    """
    user = request.user
    try:
        profile = Profile.objects.get(user=user)
    except Profile.DoesNotExist:
        return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        "username": user.username,
        "full_name": profile.full_name,
        "email": profile.email,
        "education_level": profile.education_level,
        "skills": profile.skills or [],
        "interests": profile.interests or [],
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat(request):
    user = request.user
    message = (request.data.get("message") or "").strip()

    profile, _ = Profile.objects.get_or_create(
        user=user,
        defaults={
            "full_name": user.username,
            "email": user.email or "",
            "education_level": "Class 12",
        },
    )

    if TestResult.objects.filter(user=user).exists():
        return Response({
            "reply": "Your quick test is already completed. You can view your recommendations now.",
            "actions": [{"label": "View Recommendations", "route": "/recommendations"}]
        })

    has_name = profile.full_name and profile.full_name != user.username and len(profile.full_name) > 0
    has_interests = profile.interests and isinstance(profile.interests, list) and len(profile.interests) > 0
    profile_is_incomplete = not has_name or not has_interests

    missing_items = []
    if not has_name:
        missing_items.append("your name")
    if not has_interests:
        missing_items.append("your interests")

    def with_profile_action(reply, actions):
        updated_actions = list(actions)
        if profile_is_incomplete and not any(action.get("route") == "/profile" for action in updated_actions):
            updated_actions.append({"label": "Complete Profile", "route": "/profile"})

        if profile_is_incomplete and missing_items:
            missing_text = " and ".join(missing_items)
            reply = f"{reply} You can also complete {missing_text} from your Profile page."

        return Response({
            "reply": reply,
            "actions": updated_actions,
        })

    cv = CVProfile.objects.filter(user=user).first()
    has_cv_skills = bool(cv and isinstance(cv.skills, list) and len(cv.skills) > 0)
    school_student = is_school_student(profile.education_level)
    
    # Check if profile has skills saved
    profile_has_skills = bool(profile.skills and isinstance(profile.skills, list) and len(profile.skills) > 0)

    # Always start with CV flow for non-school students only when no skills exist anywhere
    if not school_student and not has_cv_skills and not profile_has_skills:
        return with_profile_action(
            "Please upload your CV or update your skills in Profile so I can analyze your strengths and guide you to the next step.",
            [{"label": "Upload CV", "type": "upload"}, {"label": "Update Skills in Profile", "route": "/profile"}],
        )

    # For school students, marks card/subjects are valid alternatives to CV upload
    if school_student and not has_cv_skills and not profile_has_skills:
        if has_no_cv_intent(message):
            return with_profile_action(
                "No problem. Please upload your marks card (PDF/Image) with subject names and marks, or type your favourite subjects like Mathematics, Biology, Computer Science.",
                [{"label": "Upload Marks Card", "type": "upload"}],
            )

        return with_profile_action(
            "To get started, please upload your marks card/CV, or share your favourite subjects (like Mathematics, Physics, Biology, Computer Science).",
            [{"label": "Upload Marks Card", "type": "upload"}],
        )

    if has_cv_skills or profile_has_skills:
        final_skills = cv.skills if has_cv_skills else (profile.skills or [])
        skills_text = ", ".join(final_skills)
        return with_profile_action(
            f"Great {profile.full_name or 'Student'}! Your skills are: {skills_text}. Next step is to take the quick test.",
            [{"label": "Take Quick Test", "route": "/quick-test"}],
        )

    if school_student:
        # Extract subjects from user message
        subjects = extract_subjects(message)
        if subjects:
            # Save subjects directly as skills for class 10/12 students
            existing_skills = profile.skills if isinstance(profile.skills, list) else []
            existing_interests = profile.interests if isinstance(profile.interests, list) else []

            # For school students, subjects ARE skills
            profile.skills = list(dict.fromkeys(existing_skills + subjects))
            profile.interests = list(dict.fromkeys(existing_interests + subjects))
            profile.save()

            skill_text = ", ".join(profile.skills)
            return with_profile_action(
                f"Perfect! I've saved your subjects as skills: {skill_text}. You can now take the quick test.",
                [{"label": "Take Quick Test", "route": "/quick-test"}],
            )

    if not has_cv_skills and not profile_has_skills:
        return with_profile_action(
            "Please upload your CV or update your skills in Profile so I can analyze your strengths and guide you to the next step.",
            [{"label": "Upload CV", "type": "upload"}, {"label": "Update Skills in Profile", "route": "/profile"}],
        )

    return with_profile_action(
        "Your skill profile is ready. Please proceed with the quick test.",
        [{"label": "Take Quick Test", "route": "/quick-test"}],
    )