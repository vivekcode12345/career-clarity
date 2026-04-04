from django.conf import settings
from django.db import models


class UserRecommendationCache(models.Model):
	user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="recommendation_cache")
	ability = models.CharField(max_length=30, blank=True, default="")
	interest = models.CharField(max_length=80, blank=True, default="")
	skills = models.JSONField(default=list, blank=True)
	skill_signature = models.TextField(blank=True, default="")
	skill_name = models.CharField(max_length=100, blank=True, default="")
	skill_level = models.CharField(max_length=30, blank=True, default="")
	recommendations = models.JSONField(default=list, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		verbose_name_plural = "User Recommendation Caches"
		ordering = ["-updated_at"]
		indexes = [
			models.Index(fields=["user"]),
		]

	def __str__(self):
		return f"{self.user.username} - Recommendations Cache"


class SavedRoadmap(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_roadmaps")
	career_title = models.CharField(max_length=150)
	ability = models.CharField(max_length=30, blank=True, default="")
	interest = models.CharField(max_length=80, blank=True, default="")
	skills = models.JSONField(default=list, blank=True)
	roadmap_data = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = ("user", "career_title")
		ordering = ["-updated_at"]
		indexes = [
			models.Index(fields=["user", "career_title"]),
		]

	def __str__(self):
		return f"{self.user.username} - {self.career_title}"
