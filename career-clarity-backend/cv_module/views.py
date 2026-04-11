from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import CVProfile
from .utils import extract_text_from_pdf, extract_text_from_image, parse_cv, analyze_resume_text, extract_keyword_skills
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
            "education_level": "",
        }
    )

    # Update full name if provided
    if data.get("full_name"):
        profile.full_name = data["full_name"]

    # Combine predefined interests + custom interests
    interests = data.get("interests", [])
    custom_interests = data.get("custom_interests", [])
    all_interests = list(set(interests + custom_interests))  # Remove duplicates
    profile.interests = all_interests

    # Update skills if provided
    if data.get("skills"):
        skills = data.get("skills", [])
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(",") if s.strip()]
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
    try:
        file = request.FILES.get('cv')

        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        filename = file.name.lower()
        allowed_exts = ['.pdf', '.jpg', '.jpeg', '.png']
        if not any(filename.endswith(ext) for ext in allowed_exts):
            return Response({"error": "Only PDF or Image files (.jpg, .jpeg, .png) allowed"}, status=status.HTTP_400_BAD_REQUEST)

        if file.size > 10 * 1024 * 1024:
            return Response({"error": "File too large (max 10MB)"}, status=status.HTTP_400_BAD_REQUEST)

        file.seek(0)
        if filename.endswith('.pdf'):
            text = extract_text_from_pdf(file)
        else:
            text = extract_text_from_image(file)

        profile, _ = Profile.objects.get_or_create(
            user=request.user,
            defaults={
                "full_name": request.user.username,
                "email": request.user.email or "",
                "education_level": "",
            },
        )

        school_student = is_school_student(profile.education_level)
        analysis = {}

        # Dedicated marks-card flow for school students (no CV parser dependency).
        if school_student:
            strongest_subjects = extract_high_marks_subjects(text)
            effective_skills = strongest_subjects if strongest_subjects else extract_subjects(text)[:3]
        else:
            strongest_subjects = []
            try:
                data = parse_cv(text)
                skill_candidates = []
                for source in (data.get("skills", []),):
                    if isinstance(source, list):
                        skill_candidates.extend(source)

                effective_skills = list(dict.fromkeys([
                    str(skill).strip().lower()
                    for skill in skill_candidates
                    if str(skill).strip()
                ]))
            except Exception:
                effective_skills = []

            if not effective_skills:
                effective_skills = extract_keyword_skills(text, limit=25)

        try:
            analysis = analyze_resume_text(text, effective_skills)
        except Exception:
            analysis = {
                "resumeScore": 0 if not text.strip() else min(30, 5 + len(effective_skills) * 2),
                "scoreLabel": "Needs Work",
                "scoreBreakdown": {},
                "analysisSummary": "Unable to generate a detailed analysis right now.",
                "strengths": [],
                "mistakes": [],
                "improvementSuggestions": [],
                "whatToInclude": [],
                "suggestedCareers": [],
                "extractedSkills": effective_skills,
                "technicalTerms": [],
                "industryTerms": [],
                "sectionHighlights": [],
                "contactSignals": [],
                "achievementLines": [],
            }

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
            "resumeScore": analysis.get("resumeScore", 0),
            "scoreLabel": analysis.get("scoreLabel", ""),
            "scoreBreakdown": analysis.get("scoreBreakdown", {}),
            "analysisSummary": analysis.get("analysisSummary", ""),
            "strengths": analysis.get("strengths", []),
            "mistakes": analysis.get("mistakes", []),
            "improvementSuggestions": analysis.get("improvementSuggestions", []),
            "whatToInclude": analysis.get("whatToInclude", []),
            "suggestedCareers": analysis.get("suggestedCareers", []),
            "extractedSkills": analysis.get("extractedSkills", effective_skills),
            "technicalTerms": analysis.get("technicalTerms", []),
            "industryTerms": analysis.get("industryTerms", []),
            "sectionHighlights": analysis.get("sectionHighlights", []),
            "contactSignals": analysis.get("contactSignals", []),
            "achievementLines": analysis.get("achievementLines", []),
            "strongest_subjects": strongest_subjects if school_student else [],
        })
    except Exception as exc:
        return Response(
            {
                "error": "CV upload failed",
                "detail": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

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
def chatbot_api(request):
    try:
        from cv_module.chatbot_utils import build_prompt, format_short_reply, call_ai, resolve_followup_message
        
        user = request.user
        message = (request.data.get("message") or "").strip()

        profile, _ = Profile.objects.get_or_create(
            user=user,
            defaults={
                "full_name": user.username,
                "email": user.email or "",
                "education_level": "",
            },
        )

        # Check if quick test is done
        has_test_result = TestResult.objects.filter(user=user).exists()
        
        # Get skills if available
        cv = CVProfile.objects.filter(user=user).first()
        if cv and (not cv.skills or not isinstance(cv.skills, list) or len(cv.skills) == 0) and getattr(cv, "full_text", ""):
            try:
                reparsed = parse_cv(cv.full_text)
                analysis = analyze_resume_text(cv.full_text, reparsed.get("skills", []))
                recovered_skills = []
                for source in (
                    reparsed.get("skills", []),
                    analysis.get("extractedSkills", []),
                    analysis.get("technicalTerms", []),
                    analysis.get("industryTerms", []),
                ):
                    if isinstance(source, list):
                        recovered_skills.extend(source)

                recovered_skills = list(dict.fromkeys([
                    str(skill).strip().lower()
                    for skill in recovered_skills
                    if str(skill).strip()
                ]))

                if recovered_skills:
                    cv.skills = recovered_skills
                    cv.save(update_fields=["skills"])
            except Exception:
                pass

        has_cv_skills = bool(cv and isinstance(cv.skills, list) and len(cv.skills) > 0)
        school_student = is_school_student(profile.education_level)
        profile_has_skills = bool(profile.skills and isinstance(profile.skills, list) and len(profile.skills) > 0)
        has_document_skills = has_cv_skills or profile_has_skills

        has_name = profile.full_name and profile.full_name != user.username and len(profile.full_name) > 0
        has_interests = profile.interests and isinstance(profile.interests, list) and len(profile.interests) > 0
        profile_is_complete = has_name and has_interests

        # FIRST: If user opens chat (no message or onboarding trigger) → show greeting immediately (don't call AI)
        if not message or message == "__onboarding__":
            return Response({
                "reply": "How can I help you today? Ask me about careers, learning paths, skill development, or anything else!",
                "actions": []
            })

        # THEN: If user sends a message AND quick test is done AND has skills → call AI
        if has_test_result and has_document_skills:
            conversation_history = request.data.get("history") or []
            flow_context = request.data.get("flowContext") or {}
            
            resolved_message = resolve_followup_message(message, conversation_history)
            prompt = build_prompt(user, resolved_message, conversation_history, flow_context)
            ai_reply = call_ai(prompt)
            
            if ai_reply:
                formatted_reply = format_short_reply(ai_reply)
                return Response({
                    "reply": formatted_reply,
                    "actions": []
                })
            else:
                return Response({
                    "reply": "I'm temporarily unable to connect to the AI service. Please try again in a moment.",
                    "actions": []
                })

        # ===== PROFILE SETUP FLOW (before quick test or incomplete) =====
        
        missing_items = []
        if not has_name:
            missing_items.append("your name")
        if not has_interests:
            missing_items.append("your interests")

        def with_profile_action(reply, actions):
            updated_actions = list(actions)
            if not profile_is_complete and not any(action.get("route") == "/profile" for action in updated_actions):
                updated_actions.append({"label": "Complete Profile", "route": "/profile"})

            if not profile_is_complete and missing_items:
                missing_text = " and ".join(missing_items)
                reply = f"{reply} You can also complete {missing_text} from your Profile page."

            return Response({
                "reply": reply,
                "actions": updated_actions,
            })

        if not has_document_skills:
            if school_student:
                return with_profile_action(
                    "To get started, please upload your marks card/CV, or share your favourite subjects (like Mathematics, Physics, Biology, Computer Science).",
                    [{"label": "Upload Marks Card", "type": "upload"}],
                )
            else:
                return with_profile_action(
                    "Please upload your CV or update your skills in Profile so I can analyze your strengths and guide you to the next step.",
                    [{"label": "Upload CV", "type": "upload"}, {"label": "Update Skills in Profile", "route": "/profile"}],
                )

        if school_student and not has_test_result:
            subjects = extract_subjects(message)
            if subjects:
                existing_skills = profile.skills if isinstance(profile.skills, list) else []
                existing_interests = profile.interests if isinstance(profile.interests, list) else []

                profile.skills = list(dict.fromkeys(existing_skills + subjects))
                profile.interests = list(dict.fromkeys(existing_interests + subjects))
                profile.save()

                skill_text = ", ".join(profile.skills)
                return with_profile_action(
                    f"Perfect! I've saved your subjects as skills: {skill_text}. You can now take the quick test.",
                    [{"label": "Take Quick Test", "route": "/quick-test"}],
                )

        if has_document_skills and not has_test_result:
            final_skills = cv.skills if has_cv_skills else (profile.skills or [])
            skills_text = ", ".join(final_skills)
            return with_profile_action(
                f"Great {profile.full_name or 'Student'}! Your skills are: {skills_text}. Next step is to take the quick test.",
                [{"label": "Take Quick Test", "route": "/quick-test"}],
            )

        return with_profile_action(
            "Please complete your profile and upload your CV to get started.",
            [{"label": "Upload CV", "type": "upload"}, {"label": "Complete Profile", "route": "/profile"}],
        )
    except Exception as exc:
        return Response(
            {
                "reply": "I could not process your profile right now. Please upload your CV or refresh and try again.",
                "actions": [
                    {"label": "Upload CV", "type": "upload"},
                    {"label": "Complete Profile", "route": "/profile"},
                ],
                "detail": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )