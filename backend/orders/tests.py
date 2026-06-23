from decimal import Decimal

from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from menu.models import Category, MenuItem
from .models import Cart, CartItem, Order, OrderItem, OrderStatusLog


class CartTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="Testpass123"
        )
        self.category = Category.objects.create(name="Main Course", display_order=1)
        self.item = MenuItem.objects.create(
            category=self.category, name="Burger", price=9.99, is_available=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_get_cart_creates_new(self):
        response = self.client.get("/api/orders/cart/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"], [])

    def test_get_cart_returns_existing(self):
        cart = Cart.objects.create(user=self.user)
        response = self.client.get("/api/orders/cart/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], cart.id)

    def test_add_to_cart(self):
        data = {"menu_item": self.item.id, "quantity": 2}
        response = self.client.post("/api/orders/cart/add/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CartItem.objects.count(), 1)
        self.assertEqual(CartItem.objects.first().quantity, 2)

    def test_add_to_cart_increments_existing(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, menu_item=self.item, quantity=1)
        data = {"menu_item": self.item.id, "quantity": 2}
        response = self.client.post("/api/orders/cart/add/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(CartItem.objects.count(), 1)
        self.assertEqual(CartItem.objects.first().quantity, 3)

    def test_update_cart_item_quantity(self):
        cart = Cart.objects.create(user=self.user)
        cart_item = CartItem.objects.create(cart=cart, menu_item=self.item, quantity=1)
        data = {"quantity": 5}
        response = self.client.patch(
            f"/api/orders/cart/items/{cart_item.id}/", data, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(CartItem.objects.first().quantity, 5)

    def test_remove_cart_item(self):
        cart = Cart.objects.create(user=self.user)
        cart_item = CartItem.objects.create(cart=cart, menu_item=self.item, quantity=1)
        response = self.client.delete(
            f"/api/orders/cart/items/{cart_item.id}/remove/"
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(CartItem.objects.count(), 0)

    def test_cart_requires_auth(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/orders/cart/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class OrderTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="Testpass123"
        )
        self.category = Category.objects.create(name="Main Course", display_order=1)
        self.item = MenuItem.objects.create(
            category=self.category, name="Burger", price=9.99, is_available=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_create_order_requires_cart_items(self):
        data = {"payment_method": "cod", "delivery_address": "123 Street"}
        response = self.client.post("/api/orders/create/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_create_order_success(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, menu_item=self.item, quantity=2)
        data = {"payment_method": "cod", "delivery_address": "123 Street"}
        response = self.client.post("/api/orders/create/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Order.objects.count(), 1)
        order = Order.objects.first()
        self.assertEqual(order.total_price, Decimal("19.98"))
        self.assertEqual(order.status, Order.Status.PENDING)
        self.assertEqual(CartItem.objects.count(), 0)

    def test_create_order_with_online_payment(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, menu_item=self.item, quantity=1)
        data = {"payment_method": "online", "delivery_address": "123 Street"}
        response = self.client.post("/api/orders/create/", data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.first()
        self.assertEqual(order.payment_method, Order.PaymentMethod.ONLINE)

    def test_list_own_orders(self):
        order = Order.objects.create(
            user=self.user, total_price=10, status=Order.Status.PENDING,
        )
        OrderItem.objects.create(
            order=order, menu_item=self.item, quantity=1, unit_price=10,
        )
        response = self.client.get("/api/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_list_orders_excludes_others(self):
        other = User.objects.create_user(username="other", password="Other123")
        Order.objects.create(user=other, total_price=10)
        response = self.client.get("/api/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)

    def test_order_detail(self):
        order = Order.objects.create(
            user=self.user, total_price=9.99, status=Order.Status.PENDING,
        )
        response = self.client.get(f"/api/orders/{order.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("status_logs", response.data)

    def test_order_detail_other_user(self):
        other = User.objects.create_user(username="other", password="Other123")
        order = Order.objects.create(user=other, total_price=9.99)
        response = self.client.get(f"/api/orders/{order.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class OrderCancellationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="Testpass123"
        )
        self.client.force_authenticate(user=self.user)

    def test_cancel_pending_order(self):
        order = Order.objects.create(
            user=self.user, total_price=10, status=Order.Status.PENDING,
        )
        response = self.client.post(f"/api/orders/{order.id}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.status, Order.Status.CANCELLED)

    def test_cancel_other_users_order(self):
        other = User.objects.create_user(username="other", password="Other123")
        order = Order.objects.create(
            user=other, total_price=10, status=Order.Status.PENDING,
        )
        response = self.client.post(f"/api/orders/{order.id}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cancel_delivered_order_denied(self):
        order = Order.objects.create(
            user=self.user, total_price=10, status=Order.Status.DELIVERED,
        )
        response = self.client.post(f"/api/orders/{order.id}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class OrderStatusUpdateTests(APITestCase):
    def setUp(self):
        self.staff = User.objects.create_user(
            username="admin", password="Admin123", is_staff=True,
        )
        self.user = User.objects.create_user(
            username="user", password="User123",
        )
        self.order = Order.objects.create(
            user=self.user, total_price=10, status=Order.Status.PENDING,
        )

    def test_staff_can_update_status(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.patch(
            f"/api/orders/{self.order.id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, Order.Status.CONFIRMED)

    def test_non_staff_cannot_update_status(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.patch(
            f"/api/orders/{self.order.id}/status/",
            {"status": "confirmed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_transition_returns_error(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.patch(
            f"/api/orders/{self.order.id}/status/",
            {"status": "delivered"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_status_update_creates_log(self):
        self.client.force_authenticate(user=self.staff)
        self.client.patch(
            f"/api/orders/{self.order.id}/status/",
            {"status": "confirmed", "note": "Test note"},
            format="json",
        )
        self.assertEqual(OrderStatusLog.objects.count(), 1)
        log = OrderStatusLog.objects.first()
        self.assertEqual(log.from_status, "pending")
        self.assertEqual(log.to_status, "confirmed")
        self.assertEqual(log.note, "Test note")
