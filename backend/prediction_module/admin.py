from django.contrib import admin
from .models import SavedRoadmap


@admin.register(SavedRoadmap)
class SavedRoadmapAdmin(admin.ModelAdmin):
	list_display = ("user", "career_title", "updated_at", "created_at")
	search_fields = ("user__username", "career_title")
	list_filter = ("updated_at",)
