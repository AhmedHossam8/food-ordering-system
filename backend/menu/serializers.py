from rest_framework import serializers
from .models import Category, MenuItem


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            "id", "name", "name_ar", "description",
            "description_ar", "display_order",
        ]


class MenuItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = MenuItem
        fields = [
            "id", "category", "category_name", "name", "name_ar",
            "description", "description_ar", "price", "image",
            "is_available", "created_at", "updated_at",
        ]
