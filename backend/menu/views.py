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
        if category:
            queryset = queryset.filter(category_id=category)
        if available:
            queryset = queryset.filter(is_available=True)
        return queryset
