from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from .models import Question , TestResult ,SkillTestResult
import random
from django.utils import timezone
from datetime import timedelta
from collections import defaultdict
from accounts.models import Profile
from cv_module.models import CVProfile
from core.api_response import success_response, error_response




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_quick_test(request):
    if TestResult.objects.filter(user=request.user).exists():
        return success_response(
            data={
                "attempted": True,
                "questions": [],
            },
            message="You have already attempted the quick test.",
        )

    profile, _ = Profile.objects.get_or_create(
        user=request.user,
        defaults={
            "full_name": request.user.username,
            "email": request.user.email or "",
            "education_level": "Class 12",
        },
    )

    class_level = str(profile.education_level or "Class 12").strip() or "Class 12"

    cv_profile = CVProfile.objects.filter(user=request.user).first()
    topic_hints = []
    for source in (
        profile.skills or [],
        profile.interests or [],
        getattr(cv_profile, "skills", []) or [],
    ):
        if isinstance(source, list):
            topic_hints.extend([str(item).strip() for item in source if str(item).strip()])

    if profile.career_goal:
        topic_hints.append(str(profile.career_goal).strip())

    topic_hints = list(dict.fromkeys(topic_hints))

    def class_scope_queryset(question_type):
        return Question.objects.filter(
            type=question_type,
            class_level__iexact=class_level,
        )

    general_qs = list(class_scope_queryset("general"))
    interest_qs = list(class_scope_queryset("interest"))

    total_available = len(general_qs) + len(interest_qs)
    target_total = 8

    if total_available < target_total:
        from .ai_utils import generate_and_save_quick_test_questions
        generate_and_save_quick_test_questions(
            class_level,
            required_general=5,
            required_interest=3,
            topic_hints=topic_hints,
        )
        general_qs = list(class_scope_queryset("general"))
        interest_qs = list(class_scope_queryset("interest"))

    # Prefer class-matched questions; if class-specific supply is not enough, include generic ones only after class-matched
    general_selected = random.sample(general_qs, min(len(general_qs), 5))

    interest_selected = random.sample(interest_qs, min(len(interest_qs), 3))

    all_questions = general_selected + interest_selected

    if len(all_questions) < target_total:
        from .ai_utils import generate_and_save_quick_test_questions
        generate_and_save_quick_test_questions(
            class_level,
            required_general=max(5, 5 - len(general_selected)),
            required_interest=max(3, 3 - len(interest_selected)),
            topic_hints=topic_hints,
        )
        general_qs = list(class_scope_queryset("general"))
        interest_qs = list(class_scope_queryset("interest"))
        all_questions = random.sample(general_qs, min(len(general_qs), 5)) + random.sample(interest_qs, min(len(interest_qs), 3))

    random.shuffle(all_questions)

    data = []

    for q in all_questions:
        data.append({
            "id": q.id,
            "type": q.type,
            "question": q.question_text,
            "options": {
                "A": q.option_a,
                "B": q.option_b,
                "C": q.option_c,
                "D": q.option_d,
            }
        })

    message = "Quick test ready."
    if len(data) < target_total:
        message = "Quick test is ready with the available class-matched questions."

    return success_response(
        data={
            "attempted": False,
            "questions": data,
            "class_level": class_level,
        },
        message=message,
    )
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_quick_test(request):
    user = request.user

    if TestResult.objects.filter(user=user).exists():
        return error_response(
            "You have already attempted the quick test.",
            data={"attempted": True},
            status_code=400,
        )

    answers = request.data.get("answers", {})

    questions = Question.objects.filter(id__in=answers.keys())

    general_score = 0
    interest_data = {}

    for q in questions:
        user_answer = answers.get(str(q.id))

        if q.type == "general":
            if user_answer == q.correct_answer:
                general_score += 1

        elif q.type == "interest":
            # map option to category (example)
            category_map = {
                "A": "tech",
                "B": "creative",
                "C": "business",
                "D": "research"
            }

            interest = category_map.get(user_answer, "other")

            interest_data[interest] = interest_data.get(interest, 0) + 1

    # Save result
    TestResult.objects.create(
        user=user,
        general_score=general_score,
        interest_data=interest_data
    )

    return success_response(message="Test submitted successfully")

def get_user_skill(user):
    from cv_module.models import CVProfile

    try:
        cv = CVProfile.objects.get(user=user)
        skills = cv.skills
        if isinstance(skills, list) and skills:
            return str(random.choice(skills)).strip().lower()
        if isinstance(skills, str) and skills.strip():
            return skills.strip().lower()
    except Exception:
        pass

    return "aptitude"


def _normalize_skill(skill):
    return str(skill or "").strip().lower()


def _last_skill_attempt(user, skill):
    return SkillTestResult.objects.filter(user=user, skill=_normalize_skill(skill)).order_by("-created_at").first()


def _split_evenly(total, buckets):
    base = total // buckets
    remainder = total % buckets
    return [base + (1 if index < remainder else 0) for index in range(buckets)]


def _combined_question_allocation(skills, total_questions=20):
    skill_targets = _split_evenly(total_questions, len(skills))
    difficulty_keys = ["easy", "medium", "hard"]
    difficulty_targets = dict(zip(difficulty_keys, _split_evenly(total_questions, len(difficulty_keys))))
    return dict(zip(skills, skill_targets)), difficulty_targets


def _pick_combined_questions(skills, total_questions=20):
    per_skill_target, difficulty_target = _combined_question_allocation(skills, total_questions)

    pools = {}
    for skill in skills:
        for difficulty in ["easy", "medium", "hard"]:
            queryset = list(
                Question.objects.filter(
                    type="skill",
                    category=skill,
                    difficulty=difficulty,
                )
            )
            random.shuffle(queryset)
            pools[(skill, difficulty)] = queryset

    selected = []
    used_ids = set()
    skill_count = defaultdict(int)
    difficulty_count = defaultdict(int)

    for difficulty in ["easy", "medium", "hard"]:
        while difficulty_count[difficulty] < difficulty_target[difficulty]:
            candidate_skills = sorted(
                skills,
                key=lambda item: per_skill_target[item] - skill_count[item],
                reverse=True,
            )

            picked = False
            for skill in candidate_skills:
                if skill_count[skill] >= per_skill_target[skill]:
                    continue

                pool = pools.get((skill, difficulty), [])
                while pool and pool[0].id in used_ids:
                    pool.pop(0)

                if not pool:
                    continue

                question = pool.pop(0)
                selected.append(question)
                used_ids.add(question.id)
                skill_count[skill] += 1
                difficulty_count[difficulty] += 1
                picked = True
                break

            if not picked:
                break

    if len(selected) < total_questions:
        return []

    random.shuffle(selected)
    return selected[:total_questions]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_skill_options(request):
    user = request.user
    from cv_module.models import CVProfile

    try:
        cv = CVProfile.objects.get(user=user)
        raw_skills = cv.skills or []
    except CVProfile.DoesNotExist:
        raw_skills = []

    if isinstance(raw_skills, str):
        raw_skills = [raw_skills]

    normalized = []
    seen = set()
    for item in raw_skills:
        value = _normalize_skill(item)
        if not value or value in seen:
            continue
        seen.add(value)
        normalized.append(value)

    return success_response(
        data={
            "skills": normalized,
            "count": len(normalized),
        }
    )


def _cooldown_response(last_attempt):
    cooldown_until = last_attempt.created_at + timedelta(hours=24)
    remaining = cooldown_until - timezone.now()

    remaining_seconds = max(int(remaining.total_seconds()), 0)
    remaining_hours = remaining_seconds // 3600
    remaining_minutes = (remaining_seconds % 3600) // 60

    skill = _normalize_skill(last_attempt.skill)
    return error_response(
        f"You can retake the {skill} test after {remaining_hours}h {remaining_minutes}m.",
        data={
            "cooldown": True,
            "skill": skill,
            "cooldown_until": cooldown_until.isoformat(),
            "remaining_seconds": remaining_seconds,
        },
        status_code=429,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_skill_cooldown_status(request):
    user = request.user
    skill_param = _normalize_skill(request.query_params.get('skill'))

    queryset = SkillTestResult.objects.filter(user=user)
    if skill_param:
        queryset = queryset.filter(skill=skill_param)

    latest_by_skill = {}
    for attempt in queryset.order_by("skill", "-created_at"):
        key = _normalize_skill(attempt.skill)
        if key and key not in latest_by_skill:
            latest_by_skill[key] = attempt

    cooldown_by_skill = {}
    now = timezone.now()
    for skill, attempt in latest_by_skill.items():
        cooldown_until = attempt.created_at + timedelta(hours=24)
        if now >= cooldown_until:
            continue

        remaining = cooldown_until - now
        remaining_seconds = max(int(remaining.total_seconds()), 0)
        remaining_hours = remaining_seconds // 3600
        remaining_minutes = (remaining_seconds % 3600) // 60

        cooldown_by_skill[skill] = {
            "cooldown": True,
            "remaining_seconds": remaining_seconds,
            "cooldown_until": cooldown_until.isoformat(),
            "message": f"Cooldown remaining time: {remaining_hours}h {remaining_minutes}m",
        }

    if skill_param:
        skill_payload = cooldown_by_skill.get(
            skill_param,
            {"cooldown": False, "remaining_seconds": 0, "message": "Skill test is available."},
        )
        return success_response(data={"skill": skill_param, "user_id": user.id, "username": user.username, **skill_payload})

    return success_response(
        data={
            "cooldown": bool(cooldown_by_skill),
            "cooldown_by_skill": cooldown_by_skill,
            "user_id": user.id,
            "username": user.username,
        },
        message="Per-skill cooldown status loaded.",
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_skill_test(request):
    user = request.user

    # STEP 1: Get skill - first check if provided in request, otherwise from user's CV
    skill = _normalize_skill(request.query_params.get('skill'))
    if not skill:
        skill = _normalize_skill(get_user_skill(user))

    last_attempt = _last_skill_attempt(user, skill)
    if last_attempt and timezone.now() < (last_attempt.created_at + timedelta(hours=24)):
        return _cooldown_response(last_attempt)

    # STEP 2: Fetch existing questions
    questions = Question.objects.filter(
        type="skill",
        category=skill,
        difficulty__in=["medium", "hard"]
    )

    current_count = questions.count()

    # STEP 3: Ensure 15 questions using AI
    if current_count < 15:
        from .ai_utils import generate_and_save_questions
        generate_and_save_questions(skill, 15, current_count)

    # STEP 4: Fetch again after AI generation
    questions = Question.objects.filter(
        type="skill",
        category=skill,
        difficulty__in=["medium", "hard"]
    )

    if questions.count() < 15:
        return error_response(
            "Unable to generate enough questions",
            data={
                "skill": skill,
                "questions": [],
            },
            status_code=503,
        )

    # STEP 5: Select exactly 15
    selected = random.sample(list(questions), 15)

    # STEP 6: Format response
    data = []
    for q in selected:
        data.append({
            "id": q.id,
            "question": q.question_text,
            "options": {
                "A": q.option_a,
                "B": q.option_b,
                "C": q.option_c,
                "D": q.option_d,
            }
        })

    return success_response(
        data={
            "skill": skill,
            "total_questions": 15,
            "questions": data,
        }
    )
def get_skill_level(score, total):
    percentage = (score / total) * 100

    if percentage >= 75:
        return "advanced"
    elif percentage >= 40:
        return "intermediate"
    else:
        return "beginner"
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_skill_test(request):
    user = request.user

    skill = _normalize_skill(request.data.get("skill", "unknown"))

    last_attempt = _last_skill_attempt(user, skill)
    if last_attempt and timezone.now() < (last_attempt.created_at + timedelta(hours=24)):
        return _cooldown_response(last_attempt)

    answers = request.data.get("answers", {})

    if not answers:
        return error_response("No answers provided", status_code=400)

    score = 0
    total = len(answers)

    questions = Question.objects.filter(id__in=answers.keys())

    for q in questions:
        user_answer = answers.get(str(q.id))

        if user_answer == q.correct_answer:
            score += 1

    # Calculate level
    level = get_skill_level(score, total)

    # Save result
    SkillTestResult.objects.create(
        user=user,
        skill=skill,
        score=score,
        total=total,
        level=level
    )

    return success_response(
        data={
            "score": score,
            "total": total,
            "level": level,
            "skill": skill,
        },
        message=f"You are {level} in {skill}",
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_combined_skill_test(request):
    user = request.user
    skill_params = request.query_params.getlist('skills')
    if len(skill_params) == 1 and ',' in skill_params[0]:
        skill_params = [item.strip() for item in skill_params[0].split(',') if item.strip()]

    selected_skills = []
    seen = set()
    for skill in skill_params:
        normalized = _normalize_skill(skill)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        selected_skills.append(normalized)

    if len(selected_skills) < 2:
        return error_response("Select at least two skills for the combined test.", status_code=400)

    cooldown_by_skill = {}
    now = timezone.now()
    for skill in selected_skills:
        last_attempt = _last_skill_attempt(user, skill)
        if not last_attempt:
            continue
        cooldown_until = last_attempt.created_at + timedelta(hours=24)
        if now < cooldown_until:
            remaining_seconds = max(int((cooldown_until - now).total_seconds()), 0)
            cooldown_by_skill[skill] = {
                "cooldown": True,
                "remaining_seconds": remaining_seconds,
                "cooldown_until": cooldown_until.isoformat(),
            }

    if cooldown_by_skill:
        return error_response(
            "One or more selected skills are on cooldown.",
            data={"cooldown": True, "cooldown_by_skill": cooldown_by_skill},
            status_code=429,
        )

    # Use existing dataset when sufficient; trigger AI generation only for missing
    # skill+difficulty counts required for a balanced combined test.
    per_skill_target, _ = _combined_question_allocation(selected_skills, total_questions=20)
    from .ai_utils import generate_and_save_questions

    for skill in selected_skills:
        difficulty_targets = dict(zip(["easy", "medium", "hard"], _split_evenly(per_skill_target[skill], 3)))

        for difficulty, minimum_needed in difficulty_targets.items():
            current_count = Question.objects.filter(type="skill", category=skill, difficulty=difficulty).count()
            if current_count < minimum_needed:
                generate_and_save_questions(
                    skill,
                    required=minimum_needed,
                    current_count=current_count,
                    difficulty_choices=[difficulty],
                )

    selected_questions = _pick_combined_questions(selected_skills, total_questions=20)
    if len(selected_questions) < 20:
        return error_response(
            "Unable to prepare a fully balanced 20-question combined test. Please retry in a moment.",
            data={"skills": selected_skills, "questions": []},
            status_code=503,
        )

    response_questions = []
    for question in selected_questions:
        response_questions.append({
            "id": question.id,
            "question": question.question_text,
            "skill": _normalize_skill(question.category),
            "difficulty": question.difficulty,
            "options": {
                "A": question.option_a,
                "B": question.option_b,
                "C": question.option_c,
                "D": question.option_d,
            }
        })

    return success_response(
        data={
            "mode": "combined",
            "skills": selected_skills,
            "total_questions": 20,
            "duration_minutes": 20,
            "questions": response_questions,
        },
        message="Combined skill test is ready.",
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_combined_skill_test(request):
    user = request.user
    answers = request.data.get("answers", {})
    incoming_skills = request.data.get("skills", [])

    if not isinstance(answers, dict) or not answers:
        return error_response("No answers provided", status_code=400)

    if isinstance(incoming_skills, str):
        incoming_skills = [item.strip() for item in incoming_skills.split(',') if item.strip()]

    selected_skills = []
    seen = set()
    for skill in incoming_skills if isinstance(incoming_skills, list) else []:
        normalized = _normalize_skill(skill)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        selected_skills.append(normalized)

    if len(selected_skills) < 2:
        return error_response("Select at least two skills for combined submission.", status_code=400)

    now = timezone.now()
    for skill in selected_skills:
        last_attempt = _last_skill_attempt(user, skill)
        if last_attempt and now < (last_attempt.created_at + timedelta(hours=24)):
            return _cooldown_response(last_attempt)

    questions = list(Question.objects.filter(id__in=answers.keys(), type="skill"))
    if not questions:
        return error_response("No valid questions found for submission.", status_code=400)

    score = 0
    total = len(answers)
    per_skill = {skill: {"score": 0, "total": 0} for skill in selected_skills}

    for question in questions:
        question_id = str(question.id)
        user_answer = answers.get(question_id)
        skill = _normalize_skill(question.category)
        if skill in per_skill:
            per_skill[skill]["total"] += 1

        if user_answer == question.correct_answer:
            score += 1
            if skill in per_skill:
                per_skill[skill]["score"] += 1

    overall_level = get_skill_level(score, max(total, 1))

    per_skill_results = []
    for skill in selected_skills:
        skill_score = per_skill[skill]["score"]
        skill_total = per_skill[skill]["total"]
        effective_total = max(skill_total, 1)
        level = get_skill_level(skill_score, effective_total)
        SkillTestResult.objects.create(
            user=user,
            skill=skill,
            score=skill_score,
            total=effective_total,
            level=level,
        )
        per_skill_results.append({
            "skill": skill,
            "score": skill_score,
            "total": skill_total,
            "level": level,
        })

    return success_response(
        data={
            "mode": "combined",
            "skill": "combined",
            "skills": selected_skills,
            "score": score,
            "total": total,
            "level": overall_level,
            "per_skill": per_skill_results,
        },
        message="Combined skill test submitted successfully.",
    )