from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.db.models import Count, F, Sum
from django.db.models.functions import TruncDay, TruncMonth, TruncWeek
from django.utils import timezone
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from menu.models import Category, MenuItem
from orders.models import Order, OrderItem
from orders.serializers import OrderSerializer


class IsStaffUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class DashboardView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsStaffUser]

    def get(self, request):
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        total_orders = Order.objects.count()
        total_revenue = (
            Order.objects.filter(
                payment_status=Order.PaymentStatus.PAID,
                status__in=[
                    Order.Status.DELIVERED,
                    Order.Status.READY,
                    Order.Status.PREPARING,
                    Order.Status.CONFIRMED,
                ],
            ).aggregate(total=Sum("total_price"))["total"] or Decimal("0.00")
        )
        total_users = User.objects.count()
        total_menu_items = MenuItem.objects.count()
        total_categories = Category.objects.count()
        pending_orders = Order.objects.filter(status=Order.Status.PENDING).count()
        revenue_today = (
            Order.objects.filter(
                created_at__gte=today_start,
                payment_status=Order.PaymentStatus.PAID,
            ).aggregate(total=Sum("total_price"))["total"] or Decimal("0.00")
        )
        orders_today = Order.objects.filter(created_at__gte=today_start).count()

        orders_by_status = (
            Order.objects.values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )
        status_counts = {item["status"]: item["count"] for item in orders_by_status}

        recent_orders = Order.objects.select_related("user").order_by("-created_at")[:10]
        recent_data = OrderSerializer(recent_orders, many=True).data

        return Response({
            "total_revenue": total_revenue,
            "total_orders": total_orders,
            "total_users": total_users,
            "total_menu_items": total_menu_items,
            "total_categories": total_categories,
            "pending_orders": pending_orders,
            "revenue_today": revenue_today,
            "orders_today": orders_today,
            "orders_by_status": status_counts,
            "recent_orders": recent_data,
        })


class RevenueAnalyticsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsStaffUser]

    def get(self, request):
        period = request.query_params.get("period", "daily")
        days = int(request.query_params.get("days", "30"))

        since = timezone.now() - timedelta(days=days)

        orders = Order.objects.filter(
            created_at__gte=since,
            payment_status=Order.PaymentStatus.PAID,
        )

        if period == "monthly":
            trunc_fn = TruncMonth("created_at")
        elif period == "weekly":
            trunc_fn = TruncWeek("created_at")
        else:
            trunc_fn = TruncDay("created_at")

        data = (
            orders.annotate(period=trunc_fn)
            .values("period")
            .annotate(
                revenue=Sum("total_price"),
                order_count=Count("id"),
            )
            .order_by("period")
        )

        return Response([
            {
                "period": entry["period"],
                "revenue": entry["revenue"],
                "order_count": entry["order_count"],
            }
            for entry in data
        ])


class TopItemsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsStaffUser]

    def get(self, request):
        limit = int(request.query_params.get("limit", "10"))
        days = int(request.query_params.get("days", "30"))

        since = timezone.now() - timedelta(days=days) if days > 0 else None

        items = OrderItem.objects
        if since:
            items = items.filter(order__created_at__gte=since)

        data = (
            items.values(
                "menu_item__id",
                "menu_item__name",
                "menu_item__price",
                "menu_item__category__name",
            )
            .annotate(
                total_quantity=Sum("quantity"),
                total_revenue=Sum(F("unit_price") * F("quantity")),
                order_count=Count("order", distinct=True),
            )
            .order_by("-total_quantity")[:limit]
        )

        return Response([
            {
                "menu_item_id": entry["menu_item__id"],
                "name": entry["menu_item__name"],
                "category": entry["menu_item__category__name"],
                "price": entry["menu_item__price"],
                "total_quantity": entry["total_quantity"],
                "total_revenue": entry["total_revenue"],
                "order_count": entry["order_count"],
            }
            for entry in data
        ])


class AdminOrderListView(generics.ListAPIView):
    queryset = Order.objects.select_related("user").prefetch_related(
        "items", "status_logs"
    ).all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffUser]

    def get_queryset(self):
        qs = super().get_queryset()
        status = self.request.query_params.get("status")
        payment_status = self.request.query_params.get("payment_status")
        payment_method = self.request.query_params.get("payment_method")
        search = self.request.query_params.get("search")

        if status:
            qs = qs.filter(status=status)
        if payment_status:
            qs = qs.filter(payment_status=payment_status)
        if payment_method:
            qs = qs.filter(payment_method=payment_method)
        if search:
            qs = qs.filter(
                user__username__icontains=search
            ) | qs.filter(delivery_address__icontains=search)

        return qs


class AdminOrderDetailView(generics.RetrieveAPIView):
    queryset = Order.objects.select_related("user").prefetch_related(
        "items__menu_item", "status_logs__changed_by"
    ).all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated, IsStaffUser]


class ExportOrdersView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsStaffUser]

    def get(self, request):
        import csv

        from django.http import HttpResponse

        status_filter = request.query_params.get("status")
        since = request.query_params.get("since")

        orders = Order.objects.select_related("user").prefetch_related("items__menu_item")
        if status_filter:
            orders = orders.filter(status=status_filter)
        if since:
            try:
                from django.utils.dateparse import parse_date

                dt = parse_date(since)
                if dt:
                    orders = orders.filter(created_at__date__gte=dt)
            except (ValueError, TypeError):
                pass

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = "attachment; filename=orders.csv"

        writer = csv.writer(response)
        writer.writerow([
            "Order ID", "User", "Status", "Payment Method",
            "Payment Status", "Total Price", "Delivery Address",
            "Items", "Created At",
        ])

        for order in orders:
            items_summary = "; ".join(
                f"{item.quantity}x {item.menu_item.name} (${item.unit_price})"
                for item in order.items.all()
            )
            writer.writerow([
                order.id,
                order.user.username if order.user else "Deleted",
                order.status,
                order.payment_method,
                order.payment_status,
                order.total_price,
                order.delivery_address,
                items_summary,
                order.created_at.isoformat(),
            ])

        return response
