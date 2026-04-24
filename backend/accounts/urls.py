from django.urls import path
from .views import (
    register,
    send_registration_otp,
    verify_registration_otp,
    login,
    google_auth,
    google_auth_config,
    get_profile,
    logout,
    preferences_api,
    change_password_api,
    reset_tests_api,
    reset_recommendations_api,
)

urlpatterns = [
    path('register/', register),
    path('register/send-otp/', send_registration_otp),
    path('register/verify-otp/', verify_registration_otp),
    path('login/', login),
    path('google-config/', google_auth_config),
    path('google/', google_auth),
    path('profile/', get_profile),
    path('logout/', logout),
    path('preferences/', preferences_api),
    path('change-password/', change_password_api),
    path('reset-tests/', reset_tests_api),
    path('reset-recommendations/', reset_recommendations_api),
]