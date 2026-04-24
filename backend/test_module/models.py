from django.db import models
from django.contrib.auth.models import User

class Question(models.Model):
    QUESTION_TYPE = (
    ('general', 'General'),
    ('skill', 'Skill'),
    ('interest', 'Interest'), 
)

    DIFFICULTY = (
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
    )

    question_text = models.TextField()
    option_a = models.CharField(max_length=255)
    option_b = models.CharField(max_length=255)
    option_c = models.CharField(max_length=255)
    option_d = models.CharField(max_length=255)

    correct_answer = models.CharField(max_length=1)

    type = models.CharField(max_length=10, choices=QUESTION_TYPE)

    category = models.CharField(max_length=100, blank=True, null=True)
    
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY)

    class_level = models.CharField(max_length=50, blank=True, null=True)
  

    def __str__(self):
        return self.question_text
 

class TestResult(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    general_score = models.IntegerField(default=0)

    interest_data = models.JSONField(default=dict)
   
    created_at = models.DateTimeField(auto_now_add=True)

    profile_setup_completed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - Test Result"
class SkillTestResult(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    skill = models.CharField(max_length=100)
    score = models.IntegerField()
    total = models.IntegerField(default=15)
    level = models.CharField(max_length=50)  # beginner / intermediate / advanced
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.skill} - {self.level}"