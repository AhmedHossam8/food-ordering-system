import stripe
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from .models import Cart, CartItem, Order, OrderItem
from .serializers import (
    AddToCartSerializer,
    CartSerializer,
    CreateOrderSerializer,
    OrderSerializer,
    UpdateCartItemSerializer,
)
from .payment import create_payment_intent
from .serializers import OrderStatusUpdateSerializer


class CartView(generics.RetrieveAPIView):
    serializer_class = CartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        return cart


class AddToCartView(generics.CreateAPIView):
    serializer_class = AddToCartSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        cart, _ = Cart.objects.get_or_create(user=self.request.user)
        serializer.save(cart=cart)


class UpdateCartItemView(generics.UpdateAPIView):
    serializer_class = UpdateCartItemSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user)


class RemoveCartItemView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return CartItem.objects.filter(cart__user=self.request.user)


class CreateOrderView(generics.CreateAPIView):
    serializer_class = CreateOrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        cart = Cart.objects.filter(user=user).first()
        if not cart or not cart.items.exists():
            raise ValidationError("Cart is empty")

        order = serializer.save(user=user)

        for cart_item in cart.items.all():
            OrderItem.objects.create(
                order=order,
                menu_item=cart_item.menu_item,
                quantity=cart_item.quantity,
                unit_price=cart_item.menu_item.price,
            )

        total = sum(
            item.unit_price * item.quantity
            for item in order.items.all()
        )
        order.total_price = total
        order.save()

        cart.items.all().delete()

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
        return Order.objects.filter(user=self.request.user)


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

        return Response(OrderSerializer(order).data)
