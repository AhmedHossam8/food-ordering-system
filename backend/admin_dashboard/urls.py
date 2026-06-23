from django.urls import path
from .views import (
    AdminOrderDetailView,
    AdminOrderListView,
    AdminUserListView,
    AdminUserToggleStaffView,
    DashboardView,
    ExportOrdersView,
    RevenueAnalyticsView,
    TopItemsView,
)

urlpatterns = [
    path("dashboard/", DashboardView.as_view(), name="admin-dashboard"),
    path("analytics/revenue/", RevenueAnalyticsView.as_view(), name="admin-revenue"),
    path("analytics/top-items/", TopItemsView.as_view(), name="admin-top-items"),
    path("orders/export/", ExportOrdersView.as_view(), name="admin-order-export"),
    path("orders/", AdminOrderListView.as_view(), name="admin-order-list"),
    path("orders/<int:pk>/", AdminOrderDetailView.as_view(), name="admin-order-detail"),
    path("users/", AdminUserListView.as_view(), name="admin-user-list"),
    path("users/<int:pk>/toggle-staff/", AdminUserToggleStaffView.as_view(), name="admin-user-toggle-staff"),
]
