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


class College(models.Model):
	COLLEGE_TYPE_CHOICES = (
		("junior", "Junior"),
		("ug", "Undergraduate"),
		("pg", "Postgraduate"),
	)

	name = models.CharField(max_length=180)
	location = models.CharField(max_length=120)
	courses = models.JSONField(default=list, blank=True)
	fees = models.IntegerField(default=0)
	rating = models.FloatField(blank=True, null=True)
	type = models.CharField(max_length=20, choices=COLLEGE_TYPE_CHOICES)
	apply_link = models.URLField(max_length=500)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-rating", "fees", "name"]
		indexes = [
			models.Index(fields=["type", "location"]),
			models.Index(fields=["fees"]),
		]

	def __str__(self):
		return f"{self.name} ({self.type})"


class CollegeRecommendationCache(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="college_recommendation_caches")
	user_level = models.CharField(max_length=20, blank=True, default="")
	ability = models.CharField(max_length=30, blank=True, default="")
	interest = models.CharField(max_length=80, blank=True, default="")
	skills_signature = models.TextField(blank=True, default="")
	filter_signature = models.TextField(blank=True, default="")
	recommended_courses = models.JSONField(default=list, blank=True)
	highlighted_colleges = models.JSONField(default=list, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-updated_at"]
		indexes = [
			models.Index(fields=["user", "user_level"]),
			models.Index(fields=["user", "interest"]),
		]

	def __str__(self):
		return f"{self.user.username} - College Recommendations"


class CollegeDetailsInsightCache(models.Model):
	user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="college_details_caches")
	college = models.ForeignKey(College, on_delete=models.CASCADE, related_name="insight_caches")
	ability = models.CharField(max_length=30, blank=True, default="")
	interest = models.CharField(max_length=80, blank=True, default="")
	skills_signature = models.TextField(blank=True, default="")
	explanation = models.TextField(blank=True, default="")
	decision_feedback = models.JSONField(default=dict, blank=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		ordering = ["-updated_at"]
		indexes = [
			models.Index(fields=["user", "college"]),
			models.Index(fields=["user", "updated_at"]),
		]

	def __str__(self):
		return f"{self.user.username} - {self.college.name} Insights"
