from django.contrib import admin
from django.db import connection
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def health_check(request):
    try:
        connection.ensure_connection()
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {e}"

    return JsonResponse({
        "status": "healthy",
        "database": db_status,
        "debug": settings.DEBUG,
    })


@require_GET
def api_root(request):
    return JsonResponse({
        "message": "Food Ordering API",
        "version": "1.0.0",
        "endpoints": {
            "admin": "/admin/",
            "users": "/api/users/",
            "menu": "/api/menu/",
            "orders": "/api/orders/",
            "payment": "/api/orders/webhook/stripe/",
            "admin-api": "/api/admin/",
            "language": "/api/users/language/",
        },
    })

urlpatterns = [
    path("", api_root, name="api-root"),
    path("api/health/", health_check, name="health-check"),
    path("admin/", admin.site.urls),

    path("api/admin/", include("admin_dashboard.urls")),
    path("api/users/", include("users.urls")),
    path("api/menu/", include("menu.urls")),
    path("api/orders/", include("orders.urls")),
]

if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )