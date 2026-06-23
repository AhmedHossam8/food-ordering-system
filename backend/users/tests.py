from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken


class AuthTests(APITestCase):
    def test_register_user(self):
        data = {"username": "testuser", "email": "test@example.com", "password": "Testpass123"}
        response = self.client.post("/api/users/register/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["username"], "testuser")
        self.assertTrue(User.objects.filter(username="testuser").exists())

    def test_register_duplicate_username(self):
        User.objects.create_user(username="testuser", password="Testpass123")
        data = {"username": "testuser", "password": "Testpass123"}
        response = self.client.post("/api/users/register/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login(self):
        User.objects.create_user(username="testuser", password="Testpass123")
        data = {"username": "testuser", "password": "Testpass123"}
        response = self.client.post("/api/users/login/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_login_invalid_credentials(self):
        data = {"username": "nonexistent", "password": "wrong"}
        response = self.client.post("/api/users/login/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_requires_auth(self):
        response = self.client.get("/api/users/profile/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_retrieve(self):
        user = User.objects.create_user(username="testuser", password="Testpass123")
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/users/profile/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["username"], "testuser")

    def test_profile_update(self):
        user = User.objects.create_user(username="testuser", password="Testpass123")
        self.client.force_authenticate(user=user)
        response = self.client.patch(
            "/api/users/profile/", {"phone": "1234567890"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["phone"], "1234567890")


class LanguageTests(APITestCase):
    def test_language_get(self):
        user = User.objects.create_user(username="testuser", password="Testpass123")
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/users/language/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("supported_languages", response.data)

    def test_language_put_valid(self):
        user = User.objects.create_user(username="testuser", password="Testpass123")
        self.client.force_authenticate(user=user)
        response = self.client.put(
            "/api/users/language/", {"language": "ar"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["language"], "ar")

    def test_language_put_invalid(self):
        user = User.objects.create_user(username="testuser", password="Testpass123")
        self.client.force_authenticate(user=user)
        response = self.client.put(
            "/api/users/language/", {"language": "fr"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
