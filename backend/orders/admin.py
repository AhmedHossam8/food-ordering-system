from django.contrib import admin
from .models import Cart, CartItem, Order, OrderItem, OrderStatusLog


class CartItemInline(admin.TabularInline):
    model = CartItem
    extra = 1


@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "created_at"]
    inlines = [CartItemInline]


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1


class OrderStatusLogInline(admin.TabularInline):
    model = OrderStatusLog
    readonly_fields = ["from_status", "to_status", "changed_by", "note", "created_at"]
    extra = 0
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        "id", "user", "status", "payment_method",
        "payment_status", "total_price", "created_at"
    ]
    list_filter = ["status", "payment_method", "payment_status"]
    search_fields = ["user__username", "delivery_address", "transaction_id"]
    inlines = [OrderItemInline, OrderStatusLogInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ["order", "menu_item", "quantity", "unit_price"]


@admin.register(OrderStatusLog)
class OrderStatusLogAdmin(admin.ModelAdmin):
    list_display = ["order", "from_status", "to_status", "changed_by", "created_at"]
    list_filter = ["from_status", "to_status"]
    readonly_fields = ["order", "from_status", "to_status", "changed_by", "note", "created_at"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
