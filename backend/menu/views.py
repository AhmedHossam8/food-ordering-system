from django.db.models import Q
from rest_framework import permissions, viewsets
from .models import Category, MenuItem
from .serializers import CategorySerializer, MenuItemSerializer


class IsStaffOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_staff


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsStaffOrReadOnly]


class MenuItemViewSet(viewsets.ModelViewSet):
    serializer_class = MenuItemSerializer
    permission_classes = [IsStaffOrReadOnly]

    def get_queryset(self):
        queryset = MenuItem.objects.all()
        category = self.request.query_params.get("category")
        available = self.request.query_params.get("available")
        search = self.request.query_params.get("search")
        min_price = self.request.query_params.get("min_price")
        max_price = self.request.query_params.get("max_price")

        if category:
            queryset = queryset.filter(category_id=category)
        if available:
            queryset = queryset.filter(is_available=True)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(name_ar__icontains=search)
                | Q(description__icontains=search)
            )
        if min_price:
            queryset = queryset.filter(price__gte=min_price)
        if max_price:
            queryset = queryset.filter(price__lte=max_price)

        return queryset
