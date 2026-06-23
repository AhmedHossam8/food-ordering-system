import json
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core import mail
from django.test.utils import override_settings
from django.utils import timezone
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

    def test_cart_allows_guest(self):
        self.client.force_authenticate(user=None)
        response = self.client.get("/api/orders/cart/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("items", response.data)


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
        self.assertEqual(response.data["count"], 1)

    def test_list_orders_excludes_others(self):
        other = User.objects.create_user(username="other", password="Other123")
        Order.objects.create(user=other, total_price=10)
        response = self.client.get("/api/orders/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)

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


class PaymentCompletionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="Testpass123",
        )
        self.client.force_authenticate(user=self.user)
        self.order = Order.objects.create(
            user=self.user,
            payment_method=Order.PaymentMethod.ONLINE,
            payment_status=Order.PaymentStatus.PENDING,
            transaction_id="pi_test",
            total_price=Decimal("19.98"),
        )

    @patch("orders.views.retrieve_payment_intent")
    def test_complete_payment_marks_order_paid_and_confirmed(self, mock_retrieve):
        mock_retrieve.return_value = {
            "id": "pi_test",
            "status": "succeeded",
            "amount": 1998,
            "metadata": {"order_id": str(self.order.id)},
        }

        response = self.client.post(
            f"/api/orders/{self.order.id}/complete-payment/",
            {"payment_intent_id": "pi_test"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(self.order.status, Order.Status.CONFIRMED)

    @patch("orders.views.retrieve_payment_intent")
    def test_complete_payment_rejects_unpaid_intent(self, mock_retrieve):
        mock_retrieve.return_value = {
            "id": "pi_test",
            "status": "requires_payment_method",
            "amount": 1998,
            "metadata": {"order_id": str(self.order.id)},
        }

        response = self.client.post(
            f"/api/orders/{self.order.id}/complete-payment/",
            {"payment_intent_id": "pi_test"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.FAILED)
        self.assertEqual(self.order.status, Order.Status.PENDING)

    @patch("orders.views.retrieve_payment_intent")
    def test_complete_payment_rejects_wrong_amount(self, mock_retrieve):
        mock_retrieve.return_value = {
            "id": "pi_test",
            "status": "succeeded",
            "amount": 999,
            "metadata": {"order_id": str(self.order.id)},
        }

        response = self.client.post(
            f"/api/orders/{self.order.id}/complete-payment/",
            {"payment_intent_id": "pi_test"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.order.refresh_from_db()
        self.assertEqual(self.order.payment_status, Order.PaymentStatus.PENDING)


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


class StockTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="Testpass123",
        )
        self.category = Category.objects.create(name="Main Course", display_order=1)
        self.item = MenuItem.objects.create(
            category=self.category, name="Burger", price=9.99,
            is_available=True, stock=10,
        )
        self.client.force_authenticate(user=self.user)

    def test_sufficient_stock_decrements(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, menu_item=self.item, quantity=3)
        response = self.client.post(
            "/api/orders/create/",
            {"payment_method": "cod", "delivery_address": "123 Street"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock, 7)

    def test_insufficient_stock_raises_error(self):
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, menu_item=self.item, quantity=20)
        response = self.client.post(
            "/api/orders/create/",
            {"payment_method": "cod", "delivery_address": "123 Street"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Insufficient stock", response.data["detail"])
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock, 10)

    def test_zero_stock_means_unlimited(self):
        self.item.stock = 0
        self.item.save()
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, menu_item=self.item, quantity=99)
        response = self.client.post(
            "/api/orders/create/",
            {"payment_method": "cod", "delivery_address": "123 Street"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock, 0)

    def test_cancelling_order_restores_stock(self):
        self.item.stock = 5
        self.item.save()
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, menu_item=self.item, quantity=2)
        resp = self.client.post(
            "/api/orders/create/",
            {"payment_method": "cod", "delivery_address": "123 Street"},
            format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock, 3)

        order_id = resp.data["id"]
        response = self.client.post(f"/api/orders/{order_id}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.item.refresh_from_db()
        self.assertEqual(self.item.stock, 5)


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class OrderEmailTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="Testpass123",
        )
        self.category = Category.objects.create(name="Main Course", display_order=1)
        self.item = MenuItem.objects.create(
            category=self.category, name="Burger", price=9.99, is_available=True,
        )

    def test_order_creation_sends_email(self):
        self.client.force_authenticate(user=self.user)
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, menu_item=self.item, quantity=2)
        response = self.client.post(
            "/api/orders/create/",
            {"payment_method": "cod", "delivery_address": "123 Street"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Order #", mail.outbox[0].subject)
        self.assertIn("Thank you", mail.outbox[0].body)

    def test_order_creation_no_email_for_user_without_email(self):
        self.user.email = ""
        self.user.save()
        self.client.force_authenticate(user=self.user)
        cart = Cart.objects.create(user=self.user)
        CartItem.objects.create(cart=cart, menu_item=self.item, quantity=1)
        response = self.client.post(
            "/api/orders/create/",
            {"payment_method": "cod", "delivery_address": "123 Street"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 0)

    def test_status_change_sends_email(self):
        staff = User.objects.create_user(
            username="admin", password="Admin123", is_staff=True,
        )
        order = Order.objects.create(
            user=self.user, total_price=10, status=Order.Status.PENDING,
        )
        self.client.force_authenticate(user=staff)
        response = self.client.patch(
            f"/api/orders/{order.id}/status/",
            {"status": "confirmed", "note": "Your order is confirmed"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Status Update", mail.outbox[0].subject)
        self.assertIn("confirmed", mail.outbox[0].body)

    def test_cancellation_sends_email(self):
        order = Order.objects.create(
            user=self.user, total_price=10, status=Order.Status.PENDING,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f"/api/orders/{order.id}/cancel/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn("Cancelled", mail.outbox[0].subject)


class OrderFilterTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", password="Testpass123",
        )
        self.client.force_authenticate(user=self.user)
        self.order1 = Order.objects.create(
            user=self.user, total_price=10, status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PENDING,
        )
        self.order2 = Order.objects.create(
            user=self.user, total_price=20, status=Order.Status.CONFIRMED,
            payment_status=Order.PaymentStatus.PAID,
        )

    def test_filter_by_status(self):
        response = self.client.get("/api/orders/?status=pending")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.order1.id)

    def test_filter_by_payment_status(self):
        response = self.client.get("/api/orders/?payment_status=paid")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.order2.id)

    def test_filter_by_date_from(self):
        yesterday = (timezone.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        response = self.client.get(f"/api/orders/?date_from={yesterday}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_by_date_to(self):
        tomorrow = (timezone.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = self.client.get(f"/api/orders/?date_to={tomorrow}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)

    def test_filter_combined_status_and_payment(self):
        Order.objects.create(
            user=self.user, total_price=30, status=Order.Status.PENDING,
            payment_status=Order.PaymentStatus.PAID,
        )
        response = self.client.get(
            "/api/orders/?status=pending&payment_status=paid",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)


@override_settings(STRIPE_WEBHOOK_SECRET="whsec_test_secret")
class WebhookTests(APITestCase):
    @patch("orders.views.stripe.Webhook.construct_event")
    def test_webhook_payment_succeeded(self, mock_construct):
        user = User.objects.create_user(username="testuser", password="Test123")
        order = Order.objects.create(
            user=user, total_price=10, payment_status=Order.PaymentStatus.PENDING,
            status=Order.Status.PENDING,
        )
        mock_construct.return_value = {
            "type": "payment_intent.succeeded",
            "data": {
                "object": {
                    "metadata": {"order_id": str(order.id)},
                }
            },
        }
        payload = json.dumps({"id": "pi_test"})
        response = self.client.post(
            "/api/orders/webhook/stripe/",
            payload,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="t=123,v1=fakesig",
        )
        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PAID)
        self.assertEqual(order.status, Order.Status.CONFIRMED)

    @patch("orders.views.stripe.Webhook.construct_event")
    def test_webhook_payment_failed(self, mock_construct):
        user = User.objects.create_user(username="testuser", password="Test123")
        order = Order.objects.create(
            user=user, total_price=10, payment_status=Order.PaymentStatus.PENDING,
        )
        mock_construct.return_value = {
            "type": "payment_intent.payment_failed",
            "data": {
                "object": {
                    "metadata": {"order_id": str(order.id)},
                }
            },
        }
        payload = json.dumps({"id": "pi_test"})
        response = self.client.post(
            "/api/orders/webhook/stripe/",
            payload,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="t=123,v1=fakesig",
        )
        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.FAILED)

    @patch("orders.views.stripe.Webhook.construct_event")
    def test_webhook_unrelated_event_does_nothing(self, mock_construct):
        user = User.objects.create_user(username="testuser", password="Test123")
        order = Order.objects.create(
            user=user, total_price=10, payment_status=Order.PaymentStatus.PENDING,
        )
        mock_construct.return_value = {
            "type": "charge.updated",
            "data": {"object": {}},
        }
        payload = json.dumps({"id": "ch_test"})
        response = self.client.post(
            "/api/orders/webhook/stripe/",
            payload,
            content_type="application/json",
            HTTP_STRIPE_SIGNATURE="t=123,v1=fakesig",
        )
        self.assertEqual(response.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, Order.PaymentStatus.PENDING)

    def test_webhook_without_secret_returns_500(self):
        with self.settings(STRIPE_WEBHOOK_SECRET=""):
            response = self.client.post(
                "/api/orders/webhook/stripe/",
                "{}",
                content_type="application/json",
                HTTP_STRIPE_SIGNATURE="test",
            )
            self.assertEqual(response.status_code, 500)
