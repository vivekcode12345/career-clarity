from unittest import mock

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from datetime import timedelta

from cv_module.models import CVProfile
from .models import Question, SkillTestResult


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

	@mock.patch("test_module.ai_utils._get_api_key", return_value=None)
	def test_skill_endpoint_returns_unable_when_no_db_questions_and_no_ai_key(self, _mock_get_api_key):
		response = self.client.get("/api/test/skill/")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data.get("skill"), "aptitude")
		self.assertEqual(response.data.get("questions"), [])
		self.assertEqual(response.data.get("message"), "Unable to generate enough questions")

	def test_skill_endpoint_blocks_access_during_24h_cooldown(self):
		attempt = SkillTestResult.objects.create(
			user=self.user,
			skill="python",
			score=12,
			total=15,
			level="advanced",
		)
		attempt.created_at = timezone.now() - timedelta(hours=2)
		attempt.save(update_fields=["created_at"])

		response = self.client.get("/api/test/skill/?skill=python")

		self.assertEqual(response.status_code, 429)
		self.assertTrue(response.data.get("cooldown"))
		self.assertIn("retake", response.data.get("message", "").lower())
		self.assertIn("remaining_seconds", response.data)

	def test_skill_endpoint_allows_other_skill_during_python_cooldown(self):
		for index in range(1, 16):
			Question.objects.create(
				question_text=f"React Skill Question {index}",
				option_a="Option A",
				option_b="Option B",
				option_c="Option C",
				option_d="Option D",
				correct_answer="A",
				type="skill",
				category="react",
				difficulty="medium",
			)

		attempt = SkillTestResult.objects.create(
			user=self.user,
			skill="python",
			score=12,
			total=15,
			level="advanced",
		)
		attempt.created_at = timezone.now() - timedelta(hours=2)
		attempt.save(update_fields=["created_at"])

		response = self.client.get("/api/test/skill/?skill=react")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data.get("skill"), "react")
		self.assertEqual(response.data.get("total_questions"), 15)

	def test_skill_submit_blocks_access_during_24h_cooldown(self):
		for index in range(1, 3):
			Question.objects.create(
				question_text=f"Cooldown Question {index}",
				option_a="Option A",
				option_b="Option B",
				option_c="Option C",
				option_d="Option D",
				correct_answer="A",
				type="skill",
				category="python",
				difficulty="medium",
			)

		attempt = SkillTestResult.objects.create(
			user=self.user,
			skill="python",
			score=10,
			total=15,
			level="intermediate",
		)
		attempt.created_at = timezone.now() - timedelta(hours=3)
		attempt.save(update_fields=["created_at"])

		question_ids = list(Question.objects.filter(type="skill", category="python").values_list("id", flat=True)[:2])
		payload = {
			"skill": "python",
			"answers": {
				str(question_ids[0]): "A",
				str(question_ids[1]): "B",
			},
		}

		response = self.client.post("/api/test/test/skill/submit/", payload, format="json")

		self.assertEqual(response.status_code, 429)
		self.assertTrue(response.data.get("cooldown"))

	def test_skill_submit_allows_other_skill_during_python_cooldown(self):
		for index in range(1, 3):
			Question.objects.create(
				question_text=f"React Submit Question {index}",
				option_a="Option A",
				option_b="Option B",
				option_c="Option C",
				option_d="Option D",
				correct_answer="A",
				type="skill",
				category="react",
				difficulty="medium",
			)

		attempt = SkillTestResult.objects.create(
			user=self.user,
			skill="python",
			score=10,
			total=15,
			level="intermediate",
		)
		attempt.created_at = timezone.now() - timedelta(hours=3)
		attempt.save(update_fields=["created_at"])

		react_q_ids = list(Question.objects.filter(type="skill", category="react").values_list("id", flat=True)[:2])
		payload = {
			"skill": "react",
			"answers": {
				str(react_q_ids[0]): "A",
				str(react_q_ids[1]): "B",
			},
		}

		response = self.client.post("/api/test/test/skill/submit/", payload, format="json")

		self.assertEqual(response.status_code, 200)
		self.assertIn("score", response.data)

	def test_skill_cooldown_status_endpoint_returns_locked_state(self):
		attempt = SkillTestResult.objects.create(
			user=self.user,
			skill="python",
			score=11,
			total=15,
			level="intermediate",
		)
		attempt.created_at = timezone.now() - timedelta(hours=1)
		attempt.save(update_fields=["created_at"])

		response = self.client.get("/api/test/skill/cooldown/")

		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.data.get("cooldown"))
		python_cooldown = response.data.get("cooldown_by_skill", {}).get("python", {})
		self.assertTrue(python_cooldown.get("cooldown"))
		self.assertGreater(python_cooldown.get("remaining_seconds", 0), 0)

	def test_skill_cooldown_status_endpoint_returns_available_state(self):
		attempt = SkillTestResult.objects.create(
			user=self.user,
			skill="python",
			score=11,
			total=15,
			level="intermediate",
		)
		attempt.created_at = timezone.now() - timedelta(hours=25)
		attempt.save(update_fields=["created_at"])

		response = self.client.get("/api/test/skill/cooldown/")

		self.assertEqual(response.status_code, 200)
		self.assertFalse(response.data.get("cooldown"))
		self.assertEqual(response.data.get("cooldown_by_skill"), {})

	def test_skill_options_returns_user_skills_from_cv(self):
		CVProfile.objects.create(user=self.user, skills=["Python", "react", "Python", " "])

		response = self.client.get("/api/test/skill/options/")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data.get("count"), 2)
		self.assertEqual(response.data.get("skills"), ["python", "react"])

	def test_skill_options_returns_empty_when_no_cv(self):
		response = self.client.get("/api/test/skill/options/")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data.get("count"), 0)
		self.assertEqual(response.data.get("skills"), [])
