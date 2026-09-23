import json

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST


@require_GET
@ensure_csrf_cookie
def csrf_token_view(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_POST
@csrf_protect
def login_view(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "Send a valid JSON body."}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({"detail": "Send a JSON object."}, status=400)

    username = data.get("username")
    password = data.get("password")
    if not isinstance(username, str) or not isinstance(password, str) or not username or not password:
        return JsonResponse({"detail": "Username and password are required."}, status=400)

    user = authenticate(request, username=username, password=password)
    if user is None:
        return JsonResponse({"detail": "Invalid username or password."}, status=401)
    login(request, user)
    return JsonResponse({"id": user.id, "username": user.get_username(), "is_staff": user.is_staff})


@require_POST
@csrf_protect
def register_view(request):
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({"detail": "Send a valid JSON body."}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({"detail": "Send a JSON object."}, status=400)

    username = data.get("username")
    password = data.get("password")
    if not isinstance(username, str) or not isinstance(password, str):
        return JsonResponse({"detail": "Username and password are required."}, status=400)

    username = username.strip()
    if len(username) < 3 or len(username) > 150:
        return JsonResponse({"detail": "Username must be 3 to 150 characters."}, status=400)

    User = get_user_model()
    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse({"detail": "That username is already taken."}, status=400)

    try:
        validate_password(password, user=User(username=username))
    except ValidationError as exc:
        return JsonResponse({"detail": exc.messages[0]}, status=400)

    user = User.objects.create_user(username=username, password=password)
    login(request, user)
    return JsonResponse(
        {"id": user.id, "username": user.get_username(), "is_staff": user.is_staff},
        status=201,
    )


@require_POST
@csrf_protect
def logout_view(request):
    logout(request)
    return JsonResponse({"detail": "Signed out."})


@require_GET
def me_view(request):
    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"authenticated": False})
    return JsonResponse({"authenticated": True, "id": user.id, "username": user.get_username(), "is_staff": user.is_staff})