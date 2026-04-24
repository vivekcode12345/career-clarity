from django.contrib import admin

from alerts_module.models import Opportunity, UserAlertCache


@admin.register(Opportunity)
class OpportunityAdmin(admin.ModelAdmin):
    list_display = ("title", "type", "level", "source", "deadline", "created_at")
    list_filter = ("type", "level", "source")
    search_fields = ("title", "description", "link")


@admin.register(UserAlertCache)
class UserAlertCacheAdmin(admin.ModelAdmin):
    list_display = ("user", "user_level", "total_available", "updated_at")
    search_fields = ("user__username", "user__email")
    list_filter = ("user_level", "updated_at")
