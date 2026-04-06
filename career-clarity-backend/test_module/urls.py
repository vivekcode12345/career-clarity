from django.urls import path
from .views import (
    get_quick_test,
    submit_quick_test,
    get_skill_test,
    submit_skill_test,
    get_skill_cooldown_status,
    get_skill_options,
    get_combined_skill_test,
    submit_combined_skill_test,
)

urlpatterns = [
    path('quick/', get_quick_test),
    path('quick/submit/', submit_quick_test),
    path('skill/', get_skill_test),
    path('skill/options/', get_skill_options),
    path('skill/cooldown/', get_skill_cooldown_status),
    path('skill/combined/', get_combined_skill_test),
    path('skill/combined/submit/', submit_combined_skill_test),
    path('test/skill/', get_skill_test),
    path('test/skill/submit/', submit_skill_test),
]