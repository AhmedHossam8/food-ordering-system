from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from menu.models import MenuItem


class Cart(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name="carts",
        verbose_name=_("user"),
    )
    session_key = models.CharField(
        _("session key"), max_length=40, blank=True, default="",
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("cart")
        verbose_name_plural = _("carts")

    def __str__(self):
        return f"Cart #{self.id} ({self.user.username})"


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart, on_delete=models.CASCADE, related_name="items",
        verbose_name=_("cart"),
    )
    menu_item = models.ForeignKey(
        MenuItem, on_delete=models.CASCADE, related_name="cart_items",
        verbose_name=_("menu item"),
    )
    quantity = models.PositiveIntegerField(_("quantity"), default=1)

    class Meta:
        unique_together = ["cart", "menu_item"]
        verbose_name = _("cart item")
        verbose_name_plural = _("cart items")

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name}"


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", _("Pending")
        CONFIRMED = "confirmed", _("Confirmed")
        PREPARING = "preparing", _("Preparing")
        READY = "ready", _("Ready")
        DELIVERED = "delivered", _("Delivered")
        CANCELLED = "cancelled", _("Cancelled")

    VALID_TRANSITIONS = {
        Status.PENDING: [Status.CONFIRMED, Status.CANCELLED],
        Status.CONFIRMED: [Status.PREPARING, Status.CANCELLED],
        Status.PREPARING: [Status.READY, Status.CANCELLED],
        Status.READY: [Status.DELIVERED],
        Status.DELIVERED: [],
        Status.CANCELLED: [],
    }

    class PaymentMethod(models.TextChoices):
        ONLINE = "online", _("Online Payment")
        COD = "cod", _("Cash on Delivery")

    class PaymentStatus(models.TextChoices):
        PENDING = "pending", _("Pending")
        PAID = "paid", _("Paid")
        FAILED = "failed", _("Failed")
        REFUNDED = "refunded", _("Refunded")

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orders",
        verbose_name=_("user"),
    )
    status = models.CharField(
        _("status"),
        max_length=20, choices=Status.choices, default=Status.PENDING,
    )
    payment_method = models.CharField(
        _("payment method"),
        max_length=20,
        choices=PaymentMethod.choices,
        default=PaymentMethod.COD,
    )
    payment_status = models.CharField(
        _("payment status"),
        max_length=20,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )
    transaction_id = models.CharField(_("transaction ID"), max_length=200, blank=True)
    total_price = models.DecimalField(
        _("total price"), max_digits=10, decimal_places=2, default=0,
    )
    delivery_address = models.TextField(_("delivery address"), blank=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = _("order")
        verbose_name_plural = _("orders")

    def __str__(self):
        return f"Order #{self.id} ({self.status})"

    def set_status(self, new_status, user=None, note=""):
        if new_status == self.status:
            return

        allowed = self.VALID_TRANSITIONS.get(self.status, [])
        if new_status not in allowed:
            raise ValueError(
                _("Cannot transition from '%(from)s' to '%(to)s'. "
                  "Allowed transitions: %(allowed)s")
                % {
                    "from": self.status,
                    "to": new_status,
                    "allowed": [s for s in allowed],
                }
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
        Order, on_delete=models.CASCADE, related_name="items",
        verbose_name=_("order"),
    )
    menu_item = models.ForeignKey(
        MenuItem, on_delete=models.CASCADE, related_name="order_items",
        verbose_name=_("menu item"),
    )
    quantity = models.PositiveIntegerField(_("quantity"), default=1)
    unit_price = models.DecimalField(
        _("unit price"), max_digits=10, decimal_places=2,
    )

    class Meta:
        ordering = ["id"]
        verbose_name = _("order item")
        verbose_name_plural = _("order items")

    def __str__(self):
        return f"{self.quantity}x {self.menu_item.name}"


class OrderStatusLog(models.Model):
    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name="status_logs",
        verbose_name=_("order"),
    )
    from_status = models.CharField(_("from status"), max_length=20)
    to_status = models.CharField(_("to status"), max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name=_("changed by"),
    )
    note = models.TextField(_("note"), blank=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        verbose_name = _("order status log")
        verbose_name_plural = _("order status logs")

    def __str__(self):
        return f"Order #{self.order.id}: {self.from_status} -> {self.to_status}"
