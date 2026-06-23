from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from menu.models import Category, MenuItem
from orders.models import Order, OrderItem


class AdminDashboardTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            username="staff", password="Staff123", is_staff=True,
        )
        self.user = User.objects.create_user(
            username="user", password="User123",
        )
        self.category = Category.objects.create(name="Main Course", display_order=1)
        self.item = MenuItem.objects.create(
            category=self.category, name="Burger", price=9.99, is_available=True,
        )

    def test_dashboard_requires_staff(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_unauthenticated(self):
        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_dashboard_returns_all_stats(self):
        self.client.force_authenticate(user=self.staff)
        order = Order.objects.create(
            user=self.user, total_price=Decimal("19.98"),
            status=Order.Status.DELIVERED,
            payment_status=Order.PaymentStatus.PAID,
        )
        OrderItem.objects.create(
            order=order, menu_item=self.item, quantity=2, unit_price=Decimal("9.99"),
        )
        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_orders"], 1)
        self.assertEqual(response.data["total_users"], 2)
        self.assertEqual(response.data["total_menu_items"], 1)
        self.assertEqual(response.data["total_categories"], 1)
        self.assertEqual(response.data["pending_orders"], 0)
        self.assertIn("orders_today", response.data)
        self.assertIn("orders_by_status", response.data)
        self.assertIn("recent_orders", response.data)

    def test_dashboard_recent_orders_limit(self):
        self.client.force_authenticate(user=self.staff)
        for i in range(15):
            Order.objects.create(user=self.user, total_price=Decimal(str(i)))
        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["recent_orders"]), 10)

    def test_dashboard_pending_orders_count(self):
        self.client.force_authenticate(user=self.staff)
        Order.objects.create(user=self.user, total_price=10, status=Order.Status.PENDING)
        Order.objects.create(
            user=self.user, total_price=20, status=Order.Status.CONFIRMED,
        )
        response = self.client.get("/api/admin/dashboard/")
        self.assertEqual(response.data["pending_orders"], 1)
        self.assertEqual(response.data["orders_by_status"]["pending"], 1)
        self.assertEqual(response.data["orders_by_status"]["confirmed"], 1)


# Revenue analytics tests removed since revenue was removed from the system


class TopItemsTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            username="staff", password="Staff123", is_staff=True,
        )
        self.user = User.objects.create_user(
            username="user", password="User123",
        )
        self.category = Category.objects.create(name="Main Course", display_order=1)
        self.item1 = MenuItem.objects.create(
            category=self.category, name="Burger", price=9.99, is_available=True,
        )
        self.item2 = MenuItem.objects.create(
            category=self.category, name="Pizza", price=12.99, is_available=True,
        )

    def test_top_items_requires_staff(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/admin/analytics/top-items/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_top_items_returns_ordered_by_quantity(self):
        self.client.force_authenticate(user=self.staff)
        order = Order.objects.create(user=self.user, total_price=50)
        OrderItem.objects.create(
            order=order, menu_item=self.item1, quantity=5, unit_price=9.99,
        )
        OrderItem.objects.create(
            order=order, menu_item=self.item2, quantity=2, unit_price=12.99,
        )
        response = self.client.get("/api/admin/analytics/top-items/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]["name"], "Burger")
        self.assertEqual(response.data[0]["total_quantity"], 5)
        self.assertEqual(response.data[1]["total_quantity"], 2)

    def test_top_items_includes_revenue_and_order_count(self):
        self.client.force_authenticate(user=self.staff)
        order = Order.objects.create(user=self.user, total_price=10)
        OrderItem.objects.create(
            order=order, menu_item=self.item1, quantity=2, unit_price=9.99,
        )
        response = self.client.get("/api/admin/analytics/top-items/")
        item = response.data[0]
        self.assertIn("menu_item_id", item)
        self.assertIn("category", item)
        self.assertIn("price", item)
        self.assertIn("order_count", item)

    def test_top_items_limit_param(self):
        self.client.force_authenticate(user=self.staff)
        order = Order.objects.create(user=self.user, total_price=100)
        for i in range(5):
            item = MenuItem.objects.create(
                category=self.category, name=f"Item{i}", price=5,
            )
            OrderItem.objects.create(
                order=order, menu_item=item, quantity=1, unit_price=5,
            )
        response = self.client.get("/api/admin/analytics/top-items/?limit=3")
        self.assertEqual(len(response.data), 3)


class AdminOrderListTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            username="staff", password="Staff123", is_staff=True,
        )
        self.user = User.objects.create_user(
            username="regular", password="User123",
        )
        self.order1 = Order.objects.create(
            user=self.user, total_price=10, status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
        )
        self.order2 = Order.objects.create(
            user=self.user, total_price=20, status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
        )

    def test_requires_staff(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/admin/orders/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_list_all(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/admin/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_by_status(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/admin/orders/?status=pending")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["status"], "pending")

    def test_filter_by_payment_status(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/admin/orders/?payment_status=paid")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["payment_status"], "paid")

    def test_search_by_username(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/admin/orders/?search=regular")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_search_no_match(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/admin/orders/?search=nonexistent")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

    def test_search_by_delivery_address(self):
        self.client.force_authenticate(user=self.staff)
        self.order1.delivery_address = "123 Main Street"
        self.order1.save()
        response = self.client.get("/api/admin/orders/?search=Main")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)


class AdminOrderDetailTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            username="staff", password="Staff123", is_staff=True,
        )
        self.user = User.objects.create_user(
            username="user", password="User123",
        )
        self.order = Order.objects.create(
            user=self.user, total_price=15.50, status=Order.Status.PENDING,
        )

    def test_requires_staff(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get(f"/api/admin/orders/{self.order.id}/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_detail_returns_order_data(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(f"/api/admin/orders/{self.order.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.order.id)
        self.assertEqual(response.data["total_price"], "15.50")
        self.assertIn("items", response.data)
        self.assertIn("status_logs", response.data)

    def test_detail_404(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/admin/orders/9999/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class ExportOrdersTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            username="staff", password="Staff123", is_staff=True,
        )
        self.user = User.objects.create_user(
            username="user", password="User123",
        )
        self.category = Category.objects.create(name="Main Course", display_order=1)
        self.item = MenuItem.objects.create(
            category=self.category, name="Burger", price=9.99, is_available=True,
        )

    def test_export_requires_staff(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/admin/orders/export/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_export_csv_structure(self):
        self.client.force_authenticate(user=self.staff)
        order = Order.objects.create(
            user=self.user, total_price=10, status=Order.Status.PENDING,
            payment_method=Order.PaymentMethod.COD,
            payment_status=Order.PaymentStatus.PENDING,
            delivery_address="123 Street",
        )
        OrderItem.objects.create(
            order=order, menu_item=self.item, quantity=2, unit_price=5.00,
        )
        response = self.client.get("/api/admin/orders/export/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response["Content-Type"], "text/csv")
        content = response.content.decode()
        self.assertIn("Order ID", content)
        self.assertIn("User", content)
        self.assertIn("Status", content)
        self.assertIn("Payment Method", content)
        self.assertIn("Payment Status", content)
        self.assertIn("Total Price", content)
        self.assertIn("Delivery Address", content)
        self.assertIn("Items", content)
        self.assertIn("Created At", content)
        self.assertIn("Burger", content)
        self.assertIn("2x Burger", content)

    def test_export_csv_filter_by_status(self):
        self.client.force_authenticate(user=self.staff)
        Order.objects.create(user=self.user, total_price=10, status=Order.Status.PENDING)
        Order.objects.create(
            user=self.user, total_price=20, status=Order.Status.CONFIRMED,
        )
        response = self.client.get("/api/admin/orders/export/?status=pending")
        content = response.content.decode()
        lines = [l for l in content.strip().split("\n") if l]
        self.assertEqual(len(lines), 2)

    def test_export_csv_since_filter(self):
        self.client.force_authenticate(user=self.staff)
        Order.objects.create(user=self.user, total_price=10)
        from datetime import date
        yesterday = date.today().isoformat()
        response = self.client.get(
            f"/api/admin/orders/export/?since={yesterday}",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
