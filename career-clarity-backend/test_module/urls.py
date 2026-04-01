from django.urls import path
from .views import get_quick_test, submit_quick_test

urlpatterns = [
    path('quick/', get_quick_test),
    path('quick/submit/', submit_quick_test),
]