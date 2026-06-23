from django.utils.translation import activate, get_language
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from django.contrib.auth.models import User
from rest_framework.response import Response
from .models import Profile
from .serializers import ProfileSerializer, RegisterSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response({
            "message": "User created successfully",
            "user": serializer.data,
        }, status=status.HTTP_201_CREATED)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(
            user=self.request.user
        )
        return profile


class LanguageView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({
            "language": get_language(),
            "supported_languages": ["en", "ar"],
        })

    def put(self, request):
        lang = request.data.get("language")
        if lang not in ("en", "ar"):
            return Response(
                {"detail": "Unsupported language. Choose 'en' or 'ar'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.session["django_language"] = lang
        activate(lang)
        return Response({
            "language": lang,
            "supported_languages": ["en", "ar"],
        })
