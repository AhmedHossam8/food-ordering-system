from rest_framework import serializers
from menu.models import MenuItem
from utils.i18n import localized_value
from .models import Cart, CartItem, Order, OrderItem, OrderStatusLog


class LocalizedField(serializers.SerializerMethodField):
    def __init__(self, field_name, **kwargs):
        self.field_name = field_name
        super().__init__(**kwargs)

    def to_representation(self, value):
        request = self.parent.context.get("request")
        return localized_value(value, self.field_name, request)


class CartItemSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True)
    menu_item_name_localized = LocalizedField("menu_item__name")
    menu_item_price = serializers.DecimalField(
        source="menu_item.price", max_digits=10, decimal_places=2, read_only=True
    )
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id", "menu_item", "menu_item_name", "menu_item_name_localized",
            "menu_item_price", "quantity", "subtotal",
        ]

    def get_subtotal(self, obj):
        return obj.menu_item.price * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "total", "created_at", "updated_at"]

    def get_total(self, obj):
        return sum(
            item.menu_item.price * item.quantity
            for item in obj.items.all()
        )


class AddToCartSerializer(serializers.Serializer):
    menu_item = serializers.PrimaryKeyRelatedField(
        queryset=MenuItem.objects.filter(is_available=True)
    )
    quantity = serializers.IntegerField(min_value=1, default=1)

    def create(self, validated_data):
        cart = validated_data.pop("cart")
        menu_item = validated_data["menu_item"]
        quantity = validated_data.get("quantity", 1)

        cart_item, created = CartItem.objects.get_or_create(
            cart=cart,
            menu_item=menu_item,
            defaults={"quantity": quantity},
        )
        if not created:
            cart_item.quantity += quantity
            cart_item.save()
        return cart_item


class UpdateCartItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CartItem
        fields = ["quantity"]


class OrderStatusLogSerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(
        source="changed_by.username", read_only=True, default=None
    )

    class Meta:
        model = OrderStatusLog
        fields = [
            "id", "from_status", "to_status",
            "changed_by", "changed_by_name", "note", "created_at",
        ]


class OrderItemSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source="menu_item.name", read_only=True)
    menu_item_name_localized = LocalizedField("menu_item__name")

    class Meta:
        model = OrderItem
        fields = [
            "id", "menu_item", "menu_item_name", "menu_item_name_localized",
            "quantity", "unit_price",
        ]


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_logs = OrderStatusLogSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            "id", "user", "status", "payment_method",
            "payment_status", "transaction_id", "total_price",
            "delivery_address", "items", "status_logs",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "user", "status", "payment_status",
            "total_price", "transaction_id",
        ]


class OrderStatusUpdateSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True, default="")


class CreateOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["payment_method", "delivery_address"]
