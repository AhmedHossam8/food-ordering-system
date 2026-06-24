from django.db import migrations


def seed_images(apps, schema_editor):
    MenuItem = apps.get_model("menu", "MenuItem")

    images = {
        "Four Cheese": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop",
        "Margherita": "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&h=300&fit=crop",
        "Pepperoni": "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&h=300&fit=crop",
        "Vegetarian": "https://images.unsplash.com/photo-1576458088443-04a19bb13da6?w=400&h=300&fit=crop",
        "Fettuccine": "https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=400&h=300&fit=crop",
        "Lasagna": "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400&h=300&fit=crop",
        "Penne": "https://images.unsplash.com/photo-1608219992759-8d74ed8d76eb?w=400&h=300&fit=crop",
        "Spaghetti": "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
        "Biryani": "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=400&h=300&fit=crop",
        "Fried Rice": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop",
        "Kabsa": "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop",
        "Mandi": "https://images.unsplash.com/photo-1585937421612-70a008356c36?w=400&h=300&fit=crop",
        "Cola": "https://images.unsplash.com/photo-1629203851122-3726ec2e7d5f?w=400&h=300&fit=crop",
        "Mint Lemonade": "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=300&fit=crop",
        "Orange Juice": "https://images.unsplash.com/photo-1622597467836-f3285f2131b8?w=400&h=300&fit=crop",
        "Sparkling Water": "https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=300&fit=crop",
    }

    for item in MenuItem.objects.all():
        match = next(
            (url for name, url in images.items() if name.lower() in item.name.lower()),
            "",
        )
        if match:
            item.image = match
            item.save(update_fields=["image"])


class Migration(migrations.Migration):

    dependencies = [
        ("menu", "0005_change_image_to_url"),
    ]

    operations = [
        migrations.RunPython(seed_images, migrations.RunPython.noop),
    ]
