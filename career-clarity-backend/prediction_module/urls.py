from django.urls import path
from .views import predict,get_roadmap,get_college_details,get_colleges

urlpatterns = [
    path('', predict),
    path('roadmap/', get_roadmap),
    path('colleges/', get_colleges),
    path('college/details/', get_college_details),
]