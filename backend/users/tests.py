from django.contrib.auth.models import User
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core import mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
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


class PasswordResetTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="Oldpass123",
        )

    def test_password_reset_request_valid_email_sends_email(self):
        response = self.client.post(
            "/api/users/password-reset/",
            {"email": "test@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Password Reset", mail.outbox[0].subject)
        self.assertIn("/api/users/password-reset/confirm/", mail.outbox[0].body)

    def test_password_reset_request_invalid_email_returns_same_message(self):
        response = self.client.post(
            "/api/users/password-reset/",
            {"email": "nonexistent@example.com"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)
        self.assertIn(
            "If this email exists", response.data["detail"],
        )

    def test_password_reset_confirm_with_valid_token(self):
        token = PasswordResetTokenGenerator().make_token(self.user)
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        response = self.client.post(
            f"/api/users/password-reset/confirm/{uid}/{token}/",
            {"new_password1": "Newpass456", "new_password2": "Newpass456"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["detail"], "Password has been reset successfully.")
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Newpass456"))

    def test_password_reset_confirm_with_invalid_token(self):
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        response = self.client.post(
            f"/api/users/password-reset/confirm/{uid}/invalidtoken123/",
            {"new_password1": "Newpass456", "new_password2": "Newpass456"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Invalid", response.data["detail"])

    def test_password_reset_confirm_with_mismatched_passwords(self):
        token = PasswordResetTokenGenerator().make_token(self.user)
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        response = self.client.post(
            f"/api/users/password-reset/confirm/{uid}/{token}/",
            {"new_password1": "Newpass456", "new_password2": "Mismatch789"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
