from django.db import models
from django.contrib.auth.models import User

class CVProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    full_text = models.TextField(blank=True)
    skills = models.JSONField(default=list)
    uploaded_at = models.DateTimeField(auto_now=True)
    file = models.FileField(upload_to='cvs/', null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}'s CV Profile"
