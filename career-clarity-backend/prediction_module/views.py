from rest_framework.decorators import api_view
from rest_framework.decorators import permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from test_module.models import TestResult
from cv_module.models import CVProfile
from .utils import get_ability_level, get_recommendations


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def predict(request):
    user = request.user

    # Get latest test result
    test = TestResult.objects.filter(user=user).order_by('-created_at').first()

    if not test:
        return Response(
            {
                "error": "No quick test data found for the current logged-in account.",
                "user": user.username,
            },
            status=400,
        )

    # Ability
    ability = get_ability_level(test.general_score)

    # Interest
    interest_data = test.interest_data
    interest = max(interest_data, key=interest_data.get) if interest_data else "general"

    # Skills (optional)
    try:
        cv = CVProfile.objects.get(user=user)
        skills = cv.skills or []
    except CVProfile.DoesNotExist:
        skills = []

    # Recommendations
    recommendations = get_recommendations(interest, skills, ability)

    return Response({
        "ability": ability,
        "interest": interest,
        "skills": skills,
        "recommendations": recommendations
    })