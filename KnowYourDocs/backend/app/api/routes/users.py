from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import require_admin
from app.schemas.schemas import UserPublic
from app.services.metadata_store import metadata_store

router = APIRouter(prefix="/api/users", tags=["users"])

VALID_ROLES = ("Administrator", "Manager", "Employee")


class RoleUpdateRequest(BaseModel):
    role: Literal["Administrator", "Manager", "Employee"]


class ActiveUpdateRequest(BaseModel):
    is_active: bool


def _to_public(user: dict) -> UserPublic:
    return UserPublic(id=user["id"], name=user["name"], email=user["email"], role=user["role"], created_at=user["created_at"])


@router.get("", response_model=list[UserPublic])
def list_users(admin: dict = Depends(require_admin)):
    return [_to_public(u) for u in metadata_store.list_users()]


@router.patch("/{user_id}/role", response_model=UserPublic)
def update_role(user_id: str, payload: RoleUpdateRequest, admin: dict = Depends(require_admin)):
    user = metadata_store.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user["role"] = payload.role
    metadata_store.save_user(user)
    return _to_public(user)


@router.patch("/{user_id}/active", response_model=UserPublic)
def update_active(user_id: str, payload: ActiveUpdateRequest, admin: dict = Depends(require_admin)):
    user = metadata_store.get_user(user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    user["is_active"] = payload.is_active
    metadata_store.save_user(user)
    return _to_public(user)
