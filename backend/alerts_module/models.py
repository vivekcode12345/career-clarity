from django.conf import settings
from django.db import models


class Opportunity(models.Model):
    TYPE_CHOICES = (
        ("scholarship", "Scholarship"),
        ("internship", "Internship"),
        ("job", "Job"),
        ("exam", "Exam"),
    )

    LEVEL_CHOICES = (
        ("10", "Class 10"),
        ("12", "Class 12"),
        ("UG", "Undergraduate"),
        ("PG", "Postgraduate"),
    )

    title = models.CharField(max_length=300)
    type = models.CharField(max_length=30, choices=TYPE_CHOICES)
    level = models.CharField(max_length=10, choices=LEVEL_CHOICES)
    description = models.TextField(blank=True)
    link = models.URLField(max_length=1000)
    deadline = models.DateField(blank=True, null=True)
    source = models.CharField(max_length=100)
    tags = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("title", "link")
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.title} ({self.type})"


class UserAlertCache(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="alerts_cache")
    user_level = models.CharField(max_length=20, blank=True, default="")
    interest_signature = models.TextField(blank=True, default="")
    skill_signature = models.TextField(blank=True, default="")
    alerts = models.JSONField(default=list, blank=True)
    total_available = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["user"]),
            models.Index(fields=["user_level"]),
        ]

    def __str__(self):
        return f"{self.user.username} - Alerts Cache"
