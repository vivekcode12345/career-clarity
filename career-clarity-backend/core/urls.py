from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from cv_module.views import chatbot_api
from prediction_module.views import get_roadmap, get_colleges, get_college_details, get_dashboard_summary
from accounts.views import preferences_api, change_password_api, reset_tests_api, reset_recommendations_api

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),

    path('api/cv/', include('cv_module.urls')),
    path('api/chatbot/', chatbot_api),
    path('api/auth/', include('accounts.urls')),
    path('api/preferences/', preferences_api),
    path('api/change-password/', change_password_api),
    path('api/reset-tests/', reset_tests_api),
    path('api/reset-recommendations/', reset_recommendations_api),
    path('api/test/', include('test_module.urls')),
    path('api/predict/', include('prediction_module.urls')),
    path('api/', include('alerts_module.urls')),
    path('api/dashboard/', get_dashboard_summary),
    path('api/roadmap/', get_roadmap),
    path('api/colleges/', get_colleges),
    path('api/college/details/', get_college_details),
]