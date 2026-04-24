from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from django.utils import timezone
from .models import TokenBlacklist


class CustomJWTAuthentication(JWTAuthentication):
    """
    Custom JWT authentication that checks if the refresh token is blacklisted.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
            if raw_token is not None:
                token_str = raw_token.decode("utf-8")
                now = timezone.now()
                TokenBlacklist.objects.filter(expires_at__lt=now).delete()

                if TokenBlacklist.objects.filter(token=token_str, expires_at__gte=now).exists():
                    raise AuthenticationFailed("Token has been logged out")

        return super().authenticate(request)
