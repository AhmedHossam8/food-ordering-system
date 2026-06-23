from rest_framework import serializers
from utils.i18n import localized_value
from .models import Category, MenuItem


class LocalizedField(serializers.SerializerMethodField):
    def __init__(self, field_name, **kwargs):
        self.field_name = field_name
        super().__init__(**kwargs)

    def to_representation(self, value):
        request = self.parent.context.get("request")
        return localized_value(value, self.field_name, request)


class CategorySerializer(serializers.ModelSerializer):
    name_localized = LocalizedField("name")
    description_localized = LocalizedField("description")

    class Meta:
        model = Category
        fields = [
            "id", "name", "name_ar", "name_localized",
            "description", "description_ar", "description_localized",
            "display_order",
        ]


class MenuItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_name_localized = LocalizedField("category__name")
    name_localized = LocalizedField("name")
    description_localized = LocalizedField("description")

    class Meta:
        model = MenuItem
        fields = [
            "id", "category", "category_name", "category_name_localized",
            "name", "name_ar", "name_localized",
            "description", "description_ar", "description_localized",
            "price", "image",
            "is_available", "created_at", "updated_at",
        ]
