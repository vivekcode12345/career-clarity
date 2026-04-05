from django.contrib.auth.models import User
from django.db import models
from datetime import datetime, timedelta


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, default="")
    education_level = models.CharField(max_length=50, blank=True, default="Class 12")
    interests = models.JSONField(default=list, blank=True)
    skills = models.JSONField(default=list, blank=True)
    preferred_location = models.CharField(max_length=120, blank=True, default="")
    career_goal = models.TextField(blank=True, default="")

    def __str__(self):
        return self.user.username


class UserPreference(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="preferences")
    internship = models.BooleanField(default=True)
    job = models.BooleanField(default=True)
    scholarship = models.BooleanField(default=True)
    exam = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        return f"{self.user.username} preferences"


class TokenBlacklist(models.Model):
    """Store blacklisted tokens (refresh tokens that have been logged out)"""
    token = models.TextField(unique=True)
    blacklisted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()  # When the token naturally expires

    def __str__(self):
        return f"Blacklisted token at {self.blacklisted_at}"

    class Meta:
        indexes = [
            models.Index(fields=['expires_at']),
        ]