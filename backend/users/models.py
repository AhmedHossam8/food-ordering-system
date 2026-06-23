from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
        verbose_name=_("user"),
    )
    phone = models.CharField(_("phone"), max_length=20, blank=True)
    address = models.TextField(_("address"), blank=True)
    address_city = models.CharField(_("city"), max_length=100)
    address_district = models.CharField(_("district"), max_length=100)
    address_street = models.TextField(_("street"))
    address_building = models.CharField(_("building"), max_length=50)
    address_floor = models.CharField(_("floor"), max_length=20)
    address_flat = models.CharField(_("flat"), max_length=20)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("profile")
        verbose_name_plural = _("profiles")

    def __str__(self):
        return self.user.username
