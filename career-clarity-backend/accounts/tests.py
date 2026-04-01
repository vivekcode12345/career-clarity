from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Profile, TokenBlacklist


class AccountsAPITests(APITestCase):
	def setUp(self):
		self.register_url = "/api/auth/register/"
		self.login_url = "/api/auth/login/"
		self.profile_url = "/api/auth/profile/"
		self.logout_url = "/api/auth/logout/"

	def _register_payload(self, username="testuser"):
		return {
			"username": username,
			"password": "testpass123",
			"name": "Test User",
			"email": f"{username}@example.com",
			"educationLevel": "Graduate",
		}

	def test_register_creates_user_profile_and_returns_tokens(self):
		response = self.client.post(self.register_url, self._register_payload("alice"), format="json")

		self.assertEqual(response.status_code, status.HTTP_201_CREATED)
		self.assertIn("token", response.data)
		self.assertIn("refreshToken", response.data)
		self.assertEqual(response.data["user"]["name"], "Test User")

		self.assertTrue(User.objects.filter(username="alice").exists())
		profile = Profile.objects.get(user__username="alice")
		self.assertEqual(profile.full_name, "Test User")
		self.assertEqual(profile.education_level, "Graduate")

	def test_register_duplicate_user_returns_400(self):
		payload = self._register_payload("duplicate_user")
		self.client.post(self.register_url, payload, format="json")

		response = self.client.post(self.register_url, payload, format="json")

		self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
		self.assertEqual(response.data.get("error"), "User already exists")

	def test_login_returns_tokens_and_user_data(self):
		self.client.post(self.register_url, self._register_payload("bob"), format="json")

		response = self.client.post(
			self.login_url,
			{"username": "bob", "password": "testpass123"},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertIn("token", response.data)
		self.assertIn("refreshToken", response.data)
		self.assertEqual(response.data["user"]["username"], "bob")
		self.assertEqual(response.data["user"]["name"], "Test User")

	def test_profile_requires_authentication(self):
		response = self.client.get(self.profile_url)
		self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

	def test_profile_put_parses_skills_from_comma_string(self):
		register_response = self.client.post(self.register_url, self._register_payload("carol"), format="json")
		access_token = register_response.data["token"]
		self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

		response = self.client.put(
			self.profile_url,
			{
				"name": "Carol Tester",
				"skills": "Python, Django, React",
				"careerGoal": "Software Engineer",
			},
			format="json",
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data["user"]["name"], "Carol Tester")
		self.assertEqual(response.data["user"]["skills"], ["Python", "Django", "React"])

		profile = Profile.objects.get(user__username="carol")
		self.assertEqual(profile.skills, ["Python", "Django", "React"])
		self.assertEqual(profile.career_goal, "Software Engineer")

	def test_logout_blacklists_refresh_token(self):
		register_response = self.client.post(self.register_url, self._register_payload("dave"), format="json")
		access_token = register_response.data["token"]
		refresh_token = register_response.data["refreshToken"]
		self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")

		response = self.client.post(self.logout_url, {"refreshToken": refresh_token}, format="json")

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data.get("message"), "Successfully logged out")
		self.assertTrue(TokenBlacklist.objects.filter(token=refresh_token).exists())

	def test_logout_invalidates_current_access_token(self):
		register_response = self.client.post(self.register_url, self._register_payload("erin"), format="json")
		access_token = register_response.data["token"]
		refresh_token = register_response.data["refreshToken"]

		self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access_token}")
		logout_response = self.client.post(self.logout_url, {"refreshToken": refresh_token}, format="json")
		self.assertEqual(logout_response.status_code, status.HTTP_200_OK)

		profile_response = self.client.get(self.profile_url)
		self.assertEqual(profile_response.status_code, status.HTTP_401_UNAUTHORIZED)
