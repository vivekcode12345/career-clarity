from django.urls import path
from . import views
from .views import chatbot_api, get_profile_with_skills, get_profile_completion_status, update_profile_interests


urlpatterns = [
    path('', views.api_home, name='api_home'),
    path('upload-cv/', views.upload_cv, name='upload_cv'),
    path('cv-data/', views.get_cv_data, name='get_cv_data'),
    path('profile-skills/', get_profile_with_skills, name='profile_skills'),
    path('profile-completion-check/', get_profile_completion_status, name='profile_completion_check'),
    path('update-profile-interests/', update_profile_interests, name='update_profile_interests'),
    path('chatbot/', chatbot_api, name='chatbot_api'),
]
