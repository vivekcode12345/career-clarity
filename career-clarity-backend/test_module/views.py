from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Question , TestResult
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