from django.db import models
from django.utils.translation import gettext_lazy as _


class Category(models.Model):
    name = models.CharField(_("name"), max_length=100, unique=True)
    name_ar = models.CharField(_("name (Arabic)"), max_length=100, blank=True)
    description = models.TextField(_("description"), blank=True)
    description_ar = models.TextField(_("description (Arabic)"), blank=True)
    display_order = models.PositiveIntegerField(_("display order"), default=0)

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name = _("category")
        verbose_name_plural = _("categories")

    def __str__(self):
        return self.name


class MenuItem(models.Model):
    category = models.ForeignKey(
        Category, on_delete=models.CASCADE, related_name="items",
        verbose_name=_("category"),
    )
    name = models.CharField(_("name"), max_length=200)
    name_ar = models.CharField(_("name (Arabic)"), max_length=200, blank=True)
    description = models.TextField(_("description"), blank=True)
    description_ar = models.TextField(_("description (Arabic)"), blank=True)
    price = models.DecimalField(_("price"), max_digits=10, decimal_places=2)
    image = models.ImageField(_("image"), upload_to="menu_items/", blank=True, null=True)
    is_available = models.BooleanField(_("is available"), default=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        ordering = ["category", "name"]
        verbose_name = _("menu item")
        verbose_name_plural = _("menu items")

    def __str__(self):
        return self.name
