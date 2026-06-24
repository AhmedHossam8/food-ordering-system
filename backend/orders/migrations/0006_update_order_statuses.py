from django.db import migrations, models


def update_status_values(apps, schema_editor):
    Order = apps.get_model("orders", "Order")
    OrderStatusLog = apps.get_model("orders", "OrderStatusLog")
    Order.objects.filter(status="confirmed").update(status="preparing")
    Order.objects.filter(status="ready").update(status="out_for_delivery")
    OrderStatusLog.objects.filter(from_status="confirmed").update(from_status="preparing")
    OrderStatusLog.objects.filter(to_status="confirmed").update(to_status="preparing")
    OrderStatusLog.objects.filter(from_status="ready").update(from_status="out_for_delivery")
    OrderStatusLog.objects.filter(to_status="ready").update(to_status="out_for_delivery")


class Migration(migrations.Migration):
    dependencies = [
        ("orders", "0005_cart_orders_cart_session_953ed8_idx_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="order",
            name="status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("preparing", "Preparing"),
                    ("out_for_delivery", "Out for Delivery"),
                    ("delivered", "Delivered"),
                    ("cancelled", "Cancelled"),
                ],
                default="pending",
                max_length=20,
                verbose_name="status",
            ),
        ),
        migrations.RunPython(update_status_values, migrations.RunPython.noop),
    ]
