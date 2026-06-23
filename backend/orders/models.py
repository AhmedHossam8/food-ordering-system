from django.db import models
from django.conf import settings
from menu.models import MenuItem


class Cart(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="carts",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart #{self.id} ({self.user.username})"


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart, on_delete=models.CASCADE, related_name="items"
    )
    menu_item = models.ForeignKey(
        MenuItem, on_delete=models.CASCADE, related_name="cart_items"
    )
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        unique_together = ["cart", "menu_item"]

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name}"


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        PREPARING = "preparing", "Preparing"
        READY = "ready", "Ready"
        DELIVERED = "delivered", "Delivered"
        CANCELLED = "cancelled", "Cancelled"

    VALID_TRANSITIONS = {
        Status.PENDING: [Status.CONFIRMED, Status.CANCELLED],
        Status.CONFIRMED: [Status.PREPARING, Status.CANCELLED],
        Status.PREPARING: [Status.READY, Status.CANCELLED],
        Status.READY: [Status.DELIVERED],
        Status.DELIVERED: [],
        Status.CANCELLED: [],
    }

    class PaymentMethod(models.TextChoices):
        ONLINE = "online", "Online Payment"
        COD = "cod", "Cash on Delivery"

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        REFUNDED = "refunded", "Refunded"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.COD,
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    transaction_id = models.CharField(max_length=200, blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.id} ({self.status})"

    def set_status(self, new_status, user=None, note=""):
        if new_status == self.status:
            return

        allowed = self.VALID_TRANSITIONS.get(self.status, [])
        if new_status not in allowed:
            raise ValueError(
                f"Cannot transition from '{self.status}' to '{new_status}'. "
                f"Allowed transitions: {[s for s in allowed]}"
            )

        old_status = self.status
        self.status = new_status
        self.save(update_fields=["status", "updated_at"])

        OrderStatusLog.objects.create(
            order=self,
            from_status=old_status,
            to_status=new_status,
            changed_by=user,
            note=note,
        )


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="items"
    )
    menu_item = models.ForeignKey(
        MenuItem, on_delete=models.CASCADE, related_name="order_items"
    )
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name}"


class OrderStatusLog(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="status_logs"
    )
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Order #{self.order.id}: {self.from_status} -> {self.to_status}"
