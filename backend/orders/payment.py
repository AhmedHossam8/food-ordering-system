import stripe
from django.conf import settings
from decimal import Decimal


stripe.api_key = settings.STRIPE_SECRET_KEY


def create_payment_intent(order):
    if not settings.STRIPE_SECRET_KEY:
        raise ValueError("STRIPE_SECRET_KEY is not configured")

    intent = stripe.PaymentIntent.create(
        amount=int(order.total_price * Decimal("100")),
        currency="usd",
        metadata={
            "order_id": order.id,
            "user_id": order.user.id if order.user else None,
        },
    )

    order.transaction_id = intent.id
    order.save(update_fields=["transaction_id"])

    return intent


def confirm_payment_intent(intent_id):
    try:
        return stripe.PaymentIntent.retrieve(intent_id)
    except stripe.StripeError:
        return None
