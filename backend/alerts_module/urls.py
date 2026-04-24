from django.urls import path

from alerts_module.views import get_alerts

urlpatterns = [
    path("alerts/", get_alerts),
]
