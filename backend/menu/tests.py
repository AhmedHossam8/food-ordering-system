from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase
from .models import Category, MenuItem


class CategoryTests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(
            name="Main Course", name_ar="طبق رئيسي",
            description="Delicious meals", description_ar="وجبات لذيذة",
            display_order=1,
        )

    def test_list_categories(self):
        response = self.client.get("/api/menu/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Main Course")

    def test_list_categories_includes_localized(self):
        response = self.client.get("/api/menu/categories/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("name_localized", response.data[0])
        self.assertIn("description_localized", response.data[0])

    def test_create_category_requires_staff(self):
        user = User.objects.create_user(username="user", password="User123")
        self.client.force_authenticate(user=user)
        data = {"name": "Desserts", "display_order": 2}
        response = self.client.post("/api/menu/categories/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_create_category_as_staff(self):
        staff = User.objects.create_user(
            username="admin", password="Admin123", is_staff=True
        )
        self.client.force_authenticate(user=staff)
        data = {"name": "Desserts", "display_order": 2}
        response = self.client.post("/api/menu/categories/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_delete_category_requires_staff(self):
        user = User.objects.create_user(username="user", password="User123")
        self.client.force_authenticate(user=user)
        response = self.client.delete(f"/api/menu/categories/{self.category.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class MenuItemTests(APITestCase):
    def setUp(self):
        self.category = Category.objects.create(name="Main Course", display_order=1)
        self.item = MenuItem.objects.create(
            category=self.category,
            name="Burger",
            name_ar="برجر",
            price=9.99,
            is_available=True,
        )

    def test_list_items(self):
        response = self.client.get("/api/menu/items/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_filter_by_category(self):
        other = Category.objects.create(name="Drinks", display_order=2)
        MenuItem.objects.create(category=other, name="Soda", price=1.99)
        response = self.client.get(
            f"/api/menu/items/?category={self.category.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["name"], "Burger")

    def test_filter_available(self):
        MenuItem.objects.create(
            category=self.category, name="Old Item", price=5.00, is_available=False
        )
        response = self.client.get("/api/menu/items/?available=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_create_item_as_staff(self):
        staff = User.objects.create_user(
            username="admin", password="Admin123", is_staff=True
        )
        self.client.force_authenticate(user=staff)
        data = {
            "category": self.category.id,
            "name": "Pizza",
            "price": 12.99,
        }
        response = self.client.post("/api/menu/items/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_create_item_as_regular_user(self):
        user = User.objects.create_user(username="user", password="User123")
        self.client.force_authenticate(user=user)
        data = {
            "category": self.category.id,
            "name": "Pizza",
            "price": 12.99,
        }
        response = self.client.post("/api/menu/items/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_item_includes_localized_fields(self):
        response = self.client.get("/api/menu/items/")
        self.assertIn("name_localized", response.data[0])
        self.assertIn("description_localized", response.data[0])
