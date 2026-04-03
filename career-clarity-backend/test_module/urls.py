from django.urls import path
from .views import get_quick_test, submit_quick_test,get_skill_test,submit_skill_test

urlpatterns = [
    path('quick/', get_quick_test),
    path('quick/submit/', submit_quick_test),
    path('skill/', get_skill_test),
    path('test/skill/', get_skill_test),
    path('test/skill/submit/', submit_skill_test),
]