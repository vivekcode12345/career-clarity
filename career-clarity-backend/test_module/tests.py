from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from cv_module.models import CVProfile
from .models import Question


class SkillTestAPITests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(username="skill_user", password="pass12345")
		self.client.force_authenticate(user=self.user)

	def test_skill_endpoint_returns_15_for_seeded_skill_questions(self):
		CVProfile.objects.create(user=self.user, skills=["python"])

		for index in range(1, 16):
			Question.objects.create(
				question_text=f"Python Skill Question {index}",
				option_a="Option A",
				option_b="Option B",
				option_c="Option C",
				option_d="Option D",
				correct_answer="A",
				type="skill",
				category="python",
				difficulty="medium",
			)

		response = self.client.get("/api/test/skill/")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data.get("skill"), "python")
		self.assertEqual(response.data.get("total_questions"), 15)
		self.assertEqual(len(response.data.get("questions", [])), 15)

	@mock.patch("test_module.ai_utils.API_KEY", None)
	def test_skill_endpoint_returns_unable_when_no_db_questions_and_no_ai_key(self):
		response = self.client.get("/api/test/skill/")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data.get("skill"), "aptitude")
		self.assertEqual(response.data.get("questions"), [])
		self.assertEqual(response.data.get("message"), "Unable to generate enough questions")
