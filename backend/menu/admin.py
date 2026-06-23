from django.contrib import admin
from .models import Category, MenuItem


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "name_ar", "display_order"]
    search_fields = ["name", "name_ar", "description", "description_ar"]
    ordering = ["display_order"]


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "price", "is_available"]
    list_filter = ["category", "is_available"]
    search_fields = ["name", "name_ar", "description", "description_ar"]
