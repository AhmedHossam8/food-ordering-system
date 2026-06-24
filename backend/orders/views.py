import logging
import stripe
from django.conf import settings
from django.core.mail import send_mail
from django.db import models
from django.db.models import Prefetch
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from menu.models import MenuItem
from .models import Cart, CartItem, Order, OrderItem
from .serializers import (
    AddToCartSerializer,
    CartSerializer,
    CompletePaymentSerializer,
    CreateOrderSerializer,
    OrderSerializer,
    UpdateCartItemSerializer,
)
from .payment import create_payment_intent, retrieve_payment_intent
from .serializers import OrderStatusUpdateSerializer

logger = logging.getLogger(__name__)


def get_or_create_cart(request):
    if request.user.is_authenticated:
        return Cart.objects.get_or_create(user=request.user)
    if not request.session.session_key:
        request.session.save()
    return Cart.objects.get_or_create(
        session_key=request.session.session_key,
        defaults={"user": None},
    )


def get_cart_with_items(request):
    cart, _ = get_or_create_cart(request)
    return Cart.objects.prefetch_related(
        Prefetch('items', queryset=CartItem.objects.select_related('menu_item'))
    ).get(pk=cart.pk)


class CartView(generics.RetrieveAPIView):
    serializer_class = CartSerializer

    def get_object(self):
        return get_cart_with_items(self.request)


class AddToCartView(generics.CreateAPIView):
    serializer_class = AddToCartSerializer

    def perform_create(self, serializer):
        cart, _ = get_or_create_cart(self.request)
        serializer.save(cart=cart)


class UpdateCartItemView(generics.UpdateAPIView):
    serializer_class = UpdateCartItemSerializer

    def get_queryset(self):
        cart, _ = get_or_create_cart(self.request)
        return CartItem.objects.filter(cart=cart)


class RemoveCartItemView(generics.DestroyAPIView):
    def get_queryset(self):
        cart, _ = get_or_create_cart(self.request)
        return CartItem.objects.filter(cart=cart)


class ClearCartView(APIView):
    def delete(self, request):
        cart, _ = get_or_create_cart(request)
        cart.items.all().delete()
        return Response({"detail": "Cart cleared."}, status=status.HTTP_204_NO_CONTENT)


class CartCountView(APIView):
    def get(self, request):
        cart, _ = get_or_create_cart(request)
        total = sum(item.quantity for item in cart.items.all())
        return Response({"count": total})


class CreateOrderView(generics.CreateAPIView):
    serializer_class = CreateOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        cart = Cart.objects.prefetch_related(
            Prefetch('items', queryset=CartItem.objects.select_related('menu_item'))
        ).filter(user=user).first()
        if not cart or not cart.items.exists():
            raise ValidationError("Cart is empty")

        order = serializer.save(user=user)

        for cart_item in cart.items.all():
            item = cart_item.menu_item
            if item.stock > 0 and cart_item.quantity > item.stock:
                raise ValidationError(
                    f"Insufficient stock for '{item.name}'. "
                    f"Available: {item.stock}, requested: {cart_item.quantity}."
                )
            OrderItem.objects.create(
                order=order,
                menu_item=item,
                quantity=cart_item.quantity,
                unit_price=item.price,
            )
            if item.stock > 0:
                MenuItem.objects.filter(pk=item.pk).update(
                    stock=models.F("stock") - cart_item.quantity
                )

        total = sum(
            item.unit_price * item.quantity
            for item in order.items.all()
        )
        order.total_price = total
        order.save()

        cart.items.all().delete()

        try:
            send_mail(
                subject=f"Order #{order.id} Confirmed",
                message=(
                    f"Thank you for your order!\n\n"
                    f"Order #{order.id}\n"
                    f"Total: ${total}\n"
                    f"Status: {order.status}\n\n"
                    f"We will notify you when your order status changes."
                ),
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email] if user.email else [],
                fail_silently=True,
            )
        except Exception as e:
            logger.warning("Failed to send order confirmation email: %s", e)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except ValidationError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(
            OrderSerializer(serializer.instance).data,
            status=status.HTTP_201_CREATED,
        )


class OrderListView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Order.objects.filter(user=self.request.user)
        status = self.request.query_params.get("status")
        payment_status = self.request.query_params.get("payment_status")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")

        if status:
            qs = qs.filter(status=status)
        if payment_status:
            qs = qs.filter(payment_status=payment_status)
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return qs


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)


class PaymentIntentView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            order = Order.objects.get(
                id=kwargs["pk"], user=request.user
            )
        except Order.DoesNotExist:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if order.payment_method != Order.PaymentMethod.ONLINE:
            return Response(
                {"detail": "Payment method is not online payment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.payment_status == Order.PaymentStatus.PAID:
            return Response(
                {"detail": "Order is already paid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            intent = create_payment_intent(order)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except stripe.StripeError as e:
            return Response(
                {"detail": f"Payment service error: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {"client_secret": intent.client_secret, "intent_id": intent.id},
            status=status.HTTP_201_CREATED,
        )


class CompletePaymentView(generics.CreateAPIView):
    serializer_class = CompletePaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            order = Order.objects.get(id=kwargs["pk"], user=request.user)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if order.payment_method != Order.PaymentMethod.ONLINE:
            return Response(
                {"detail": "Payment method is not online payment."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        payment_intent_id = serializer.validated_data["payment_intent_id"]

        if order.transaction_id and payment_intent_id != order.transaction_id:
            return Response(
                {"detail": "Payment intent does not match this order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        intent = retrieve_payment_intent(payment_intent_id)
        if not intent:
            return Response(
                {"detail": "Payment could not be verified."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        metadata_order_id = str(intent.get("metadata", {}).get("order_id", ""))
        if metadata_order_id and metadata_order_id != str(order.id):
            return Response(
                {"detail": "Payment intent belongs to a different order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expected_amount = int(order.total_price * 100)
        if intent.get("amount") != expected_amount:
            return Response(
                {"detail": "Payment amount does not match the order total."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if intent.get("status") != "succeeded":
            if intent.get("status") in ["requires_payment_method", "canceled"]:
                order.payment_status = Order.PaymentStatus.FAILED
                order.save(update_fields=["payment_status", "updated_at"])
            return Response(
                {"detail": "Payment has not succeeded."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.payment_status = Order.PaymentStatus.PAID
        order.transaction_id = payment_intent_id
        order.save(update_fields=["payment_status", "transaction_id", "updated_at"])

        try:
            order.set_status(Order.Status.CONFIRMED, note="Payment confirmed")
        except ValueError:
            pass

        return Response(OrderSerializer(order).data)


@csrf_exempt
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

    if not settings.STRIPE_WEBHOOK_SECRET:
        return HttpResponse("Webhook secret not configured", status=500)

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        return HttpResponse("Invalid payload", status=400)
    except stripe.error.SignatureVerificationError:
        return HttpResponse("Invalid signature", status=400)

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        order_id = intent["metadata"].get("order_id")
        if order_id:
            order = Order.objects.get(id=order_id)
            order.payment_status = Order.PaymentStatus.PAID
            order.save(update_fields=["payment_status", "updated_at"])
            try:
                order.set_status(Order.Status.CONFIRMED, note="Payment confirmed")
            except ValueError:
                pass

    elif event["type"] == "payment_intent.payment_failed":
        intent = event["data"]["object"]
        order_id = intent["metadata"].get("order_id")
        if order_id:
            Order.objects.filter(id=order_id).update(
                payment_status=Order.PaymentStatus.FAILED,
            )

    return HttpResponse(status=200)


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class OrderStatusUpdateView(generics.UpdateAPIView):
    queryset = Order.objects.all()
    serializer_class = OrderStatusUpdateSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffUser]

    def update(self, request, *args, **kwargs):
        try:
            order = self.get_object()
        except Order.DoesNotExist:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data["status"]
        note = serializer.validated_data.get("note", "")

        try:
            order.set_status(new_status, user=request.user, note=note)
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if order.user and order.user.email:
            try:
                send_mail(
                    subject=f"Order #{order.id} Status Update",
                    message=(
                        f"Your order #{order.id} status has changed to '{order.status}'.\n\n"
                        f"Note: {note or 'No additional notes.'}\n\n"
                        f"Thank you for choosing us!"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[order.user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.warning("Failed to send status email: %s", e)

        return Response(OrderSerializer(order).data)


class CancelOrderView(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        try:
            order = Order.objects.get(id=kwargs["pk"], user=request.user)
        except Order.DoesNotExist:
            return Response(
                {"detail": "Order not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if order.status not in (Order.Status.PENDING, Order.Status.CONFIRMED):
            return Response(
                {"detail": "Only pending or confirmed orders can be cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            order.set_status(
                Order.Status.CANCELLED,
                user=request.user,
                note=request.data.get("note", "Cancelled by user"),
            )
        except ValueError as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for order_item in order.items.all():
            if order_item.menu_item.stock > 0:
                MenuItem.objects.filter(pk=order_item.menu_item.pk).update(
                    stock=models.F("stock") + order_item.quantity
                )

        if order.user and order.user.email:
            try:
                send_mail(
                    subject=f"Order #{order.id} Cancelled",
                    message=f"Your order #{order.id} has been cancelled.\n\nIf you did not request this, please contact support.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[order.user.email],
                    fail_silently=True,
                )
            except Exception as e:
                logger.warning("Failed to send cancellation email: %s", e)

        return Response(OrderSerializer(order).data)


class SimulatePaymentView(APIView):
    """Dev-only endpoint to simulate a successful online payment for testing.

    Only allowed when settings.DEBUG is True.
    Marks the order as PAID and attempts to confirm the order.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        if not settings.DEBUG:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)

        try:
            order = Order.objects.get(id=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({"detail": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        if order.payment_status == Order.PaymentStatus.PAID:
            return Response({"detail": "Order already paid."}, status=status.HTTP_400_BAD_REQUEST)

        order.payment_status = Order.PaymentStatus.PAID
        order.save(update_fields=["payment_status", "updated_at"])
        try:
            order.set_status(Order.Status.CONFIRMED, note="Simulated payment (dev)")
        except ValueError:
            pass

        return Response(OrderSerializer(order).data)
