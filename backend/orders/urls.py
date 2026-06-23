from django.urls import path
from .views import (
    AddToCartView,
    CartView,
    CreateOrderView,
    OrderDetailView,
    OrderListView,
    PaymentIntentView,
    RemoveCartItemView,
    UpdateCartItemView,
    stripe_webhook,
)

urlpatterns = [
    path("cart/", CartView.as_view(), name="cart"),
    path("cart/add/", AddToCartView.as_view(), name="cart-add"),
    path("cart/items/<int:pk>/", UpdateCartItemView.as_view(), name="cart-item-update"),
    path("cart/items/<int:pk>/remove/", RemoveCartItemView.as_view(), name="cart-item-remove"),
    path("", OrderListView.as_view(), name="order-list"),
    path("create/", CreateOrderView.as_view(), name="order-create"),
    path("<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("<int:pk>/payment-intent/", PaymentIntentView.as_view(), name="payment-intent"),
    path("webhook/stripe/", stripe_webhook, name="stripe-webhook"),
]
