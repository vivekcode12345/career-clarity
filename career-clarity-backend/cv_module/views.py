from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import CVProfile
from .utils import extract_text_from_pdf, extract_text_from_image, parse_cv
from accounts.models import Profile
from test_module.models import TestResult, SkillTestResult
from .chat_utils import extract_subjects, is_school_student, has_no_cv_intent, extract_high_marks_subjects
from .chatbot_utils import is_relevant_question, build_prompt, call_ai, format_short_reply


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
        "uploaded": True,
        "skills": profile.skills or [],
        "has_skills": bool(isinstance(profile.skills, list) and len(profile.skills) > 0),
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
def chatbot_api(request):
    """Career guidance chatbot endpoint backed by OpenRouter."""
    user = request.user
    message = (request.data.get("message") or "").strip()

    if not message:
        return Response({"message": "Message is required."}, status=400)

    profile, _ = Profile.objects.get_or_create(
        user=user,
        defaults={
            "full_name": user.username,
            "email": user.email or "",
            "education_level": "Class 12",
        },
    )

    def _response(reply, actions=None, include_profile_reminder=True):
        final_reply = str(reply or "").strip()
        if include_profile_reminder and not profile_updated:
            reminder = "Please update your profile details when possible for better guidance."
            if reminder.lower() not in final_reply.lower():
                final_reply = f"{final_reply}\n{reminder}" if final_reply else reminder

        return Response({
            "reply": final_reply,
            "actions": actions or [],
        })

    has_name = bool(profile.full_name and profile.full_name.strip() and profile.full_name != user.username)
    has_interests = bool(isinstance(profile.interests, list) and len(profile.interests) > 0)
    profile_updated = bool(has_name and has_interests)
    school_student = is_school_student(profile.education_level)

    cv_profile = CVProfile.objects.filter(user=user).first()
    has_cv_skills = bool(cv_profile and isinstance(cv_profile.skills, list) and len(cv_profile.skills) > 0)
    has_uploaded_document = bool(cv_profile)
    profile_has_skills = bool(isinstance(profile.skills, list) and len(profile.skills) > 0)
    onboarding_completed = bool(profile_updated or has_uploaded_document or profile_has_skills)
    quick_test_attempted = TestResult.objects.filter(user=user).exists()
    skill_test_attempted = SkillTestResult.objects.filter(user=user).exists()

    def _workflow_actions():
        actions = []

        if not onboarding_completed:
            actions.append({"label": "Update Profile", "route": "/profile"})
            actions.append({"label": "Upload Marks Card", "type": "upload"} if school_student else {"label": "Upload CV", "type": "upload"})
            return actions

        if not profile_updated:
            # If a document/skills already exist, do not force profile-update navigation.
            if not has_uploaded_document and not profile_has_skills:
                actions.append({"label": "Update Profile", "route": "/profile"})
                actions.append({"label": "Upload Marks Card", "type": "upload"} if school_student else {"label": "Upload CV", "type": "upload"})
            else:
                actions.append({"label": "Take Quick Test", "route": "/quick-test"})
            return actions

        if not quick_test_attempted:
            actions.append({"label": "Take Quick Test", "route": "/quick-test"})
            return actions

        actions.append({"label": "View Recommendations", "route": "/recommendations"})
        actions.append({"label": "Take Skill Test", "route": "/quick-test"})
        return actions

    workflow_actions = _workflow_actions()

    # Bootstrap request used when chat opens: show next-step actions immediately.
    if message.lower() in {"__onboarding__", "start", "hi", "hello", "hey"}:
        if quick_test_attempted and skill_test_attempted:
            return _response(
                "How can I help you with your career or education today?",
                workflow_actions,
                include_profile_reminder=False,
            )

        if not onboarding_completed:
            return _response(
                f"Welcome! To get started, upload your {'marks card' if school_student else 'CV'} or update your profile.",
                workflow_actions,
            )

        if not profile_updated:
            return _response("Welcome! Document is received. Continue with quick test.", workflow_actions)

        if not quick_test_attempted:
            return _response("Great! Your profile is ready. Continue with the quick test.", workflow_actions)

        return _response("Great progress! Open recommendations next, then take skill test for deeper insights.", workflow_actions)

    # If school users type subjects before uploading marks card, save them as skills.
    if school_student and not quick_test_attempted and not onboarding_completed:
        subjects = extract_subjects(message)
        if subjects:
            existing_skills = profile.skills if isinstance(profile.skills, list) else []
            existing_interests = profile.interests if isinstance(profile.interests, list) else []
            profile.skills = list(dict.fromkeys(existing_skills + subjects))
            profile.interests = list(dict.fromkeys(existing_interests + subjects))
            profile.save()

            return _response(
                f"Saved your subjects as skills: {', '.join(profile.skills)}. Next step: quick test.",
                [{"label": "Take Quick Test", "route": "/quick-test"}],
            )

    if not is_relevant_question(message):
        return _response("I can only help with career and education related questions.", workflow_actions)

    prompt = build_prompt(user, message)
    reply = call_ai(prompt)

    if not reply:
        return _response("I’m unable to answer right now. Please try again in a moment.", workflow_actions)

    return _response(format_short_reply(reply), workflow_actions)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat(request):
    """Backward-compatible alias for the chatbot endpoint."""
    return chatbot_api(request)