from django.urls import path
from .views import (
    register,
    login,
    get_profile,
    logout,
    preferences_api,
    change_password_api,
    reset_tests_api,
    reset_recommendations_api,
)

urlpatterns = [
    path('register/', register),
    path('login/', login),
    path('profile/', get_profile),
    path('logout/', logout),
    path('preferences/', preferences_api),
    path('change-password/', change_password_api),
    path('reset-tests/', reset_tests_api),
    path('reset-recommendations/', reset_recommendations_api),
]