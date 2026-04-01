from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),

    path('api/token/', TokenObtainPairView.as_view()),
    path('api/token/refresh/', TokenRefreshView.as_view()),

    path('api/cv/', include('cv_module.urls')),
    path('api/auth/', include('accounts.urls')),
    path('api/test/', include('test_module.urls')),
    path('api/predict/', include('prediction_module.urls')),
]