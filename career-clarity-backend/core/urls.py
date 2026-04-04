from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from cv_module.views import chatbot_api
from prediction_module.views import get_roadmap, get_colleges, get_college_details

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),

    path('api/cv/', include('cv_module.urls')),
    path('api/chatbot/', chatbot_api),
    path('api/auth/', include('accounts.urls')),
    path('api/test/', include('test_module.urls')),
    path('api/predict/', include('prediction_module.urls')),
    path('api/roadmap/', get_roadmap),
    path('api/colleges/', get_colleges),
    path('api/college/details/', get_college_details),
]