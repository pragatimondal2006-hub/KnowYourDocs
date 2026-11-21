from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.security import create_access_token
from app.schemas.schemas import LoginRequest, RegisterRequest, TokenResponse, UserPublic
from app.services.auth_service import AuthError, authenticate_user, register_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _to_public(user: dict) -> UserPublic:
    return UserPublic(id=user["id"], name=user["name"], email=user["email"], role=user["role"], created_at=user["created_at"])


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest):
    try:
        user = register_user(payload.name, payload.email, payload.password)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    token = create_access_token(subject=user["id"])
    return TokenResponse(access_token=token, user=_to_public(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    try:
        user = authenticate_user(payload.email, payload.password)
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    token = create_access_token(subject=user["id"])
    return TokenResponse(access_token=token, user=_to_public(user))


@router.get("/me", response_model=UserPublic)
def me(current_user: dict = Depends(get_current_user)):
    return _to_public(current_user)
