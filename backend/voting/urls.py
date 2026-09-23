from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .auth_views import csrf_token_view, login_view, logout_view, me_view, register_view
from .views import ElectionViewSet

router = DefaultRouter()
router.register("elections", ElectionViewSet, basename="election")

urlpatterns = [
    path("auth/csrf/", csrf_token_view, name="csrf-token"),
    path("auth/login/", login_view, name="login"),
    path("auth/register/", register_view, name="register"),
    path("auth/logout/", logout_view, name="logout"),
    path("auth/me/", me_view, name="me"),
    path("", include(router.urls)),
]