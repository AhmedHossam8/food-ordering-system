from django.utils.translation import get_language


def get_language_from_request(request):
    lang = request.query_params.get("lang")
    if lang and lang in ("ar", "en"):
        return lang
    return get_language() or "en"


def localized_value(instance, field_name, request=None, lang=None):
    if lang is None:
        lang = "en"
        if request is not None:
            lang = get_language_from_request(request)

    if lang == "ar":
        parts = field_name.split("__")
        ar_parts = []
        obj = instance
        for part in parts:
            ar_parts.append(part)
            ar_field = f"{part}_ar"
            if hasattr(obj, ar_field) and getattr(obj, ar_field):
                val = getattr(obj, ar_field)
                if val:
                    return val
            obj = getattr(obj, part, None)
            if obj is None:
                break

    parts = field_name.split("__")
    obj = instance
    for part in parts:
        obj = getattr(obj, part, None)
        if obj is None:
            return None
    return obj
