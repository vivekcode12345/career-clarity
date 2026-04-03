from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Question , TestResult ,SkillTestResult
import random




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_quick_test(request):
    import random

    if TestResult.objects.filter(user=request.user).exists():
        return Response({
            "attempted": True,
            "message": "You have already attempted the quick test.",
            "questions": []
        })

    # General questions
    general_qs = list(Question.objects.filter(type="general"))
    general_selected = random.sample(general_qs, min(len(general_qs), 5))

    # Interest questions
    interest_qs = list(Question.objects.filter(type="interest"))
    interest_selected = random.sample(interest_qs, min(len(interest_qs), 3))

    all_questions = general_selected + interest_selected
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

    return Response({"attempted": False, "questions": data})
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_quick_test(request):
    user = request.user

    if TestResult.objects.filter(user=user).exists():
        return Response(
            {
                "attempted": True,
                "message": "You have already attempted the quick test."
            },
            status=400
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

    return Response({
        "message": "Test submitted successfully"
    })

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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_skill_test(request):
    user = request.user

    # STEP 1: Get skill
    skill = get_user_skill(user)

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
        return Response({
            "skill": skill,
            "questions": [],
            "message": "Unable to generate enough questions"
        })

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

    return Response({
        "skill": skill,
        "total_questions": 15,
        "questions": data
    })
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

    answers = request.data.get("answers", {})
    skill = request.data.get("skill", "unknown")

    if not answers:
        return Response({"error": "No answers provided"}, status=400)

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

    return Response({
        "score": score,
        "total": total,
        "level": level,
        "message": f"You are {level} in {skill}"
    })