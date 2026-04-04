from django.urls import path
from .views import predict,get_roadmap

urlpatterns = [
    path('', predict),
    path('roadmap/', get_roadmap),
]