"""
User registration and authentication logic (MODULE 1).

Passwords are hashed with bcrypt before storage; the raw password is never
persisted or logged. The very first registered user is automatically made an
Administrator so the app is usable immediately after setup; everyone after
that registers as an Employee by default.
"""
import uuid
from datetime import datetime, timezone

from app.core.security import hash_password, verify_password
from app.services.metadata_store import metadata_store


class AuthError(Exception):
    pass


def register_user(name: str, email: str, password: str) -> dict:
    if metadata_store.get_user_by_email(email):
        raise AuthError("An account with this email already exists.")

    is_first_user = len(metadata_store.users) == 0
    user = {
        "id": str(uuid.uuid4()),
        "name": name,
        "email": email,
        "password_hash": hash_password(password),
        "role": "Administrator" if is_first_user else "Employee",
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    metadata_store.save_user(user)
    return user


def authenticate_user(email: str, password: str) -> dict:
    user = metadata_store.get_user_by_email(email)
    if not user or not user.get("is_active", True):
        raise AuthError("Invalid email or password.")
    if not verify_password(password, user["password_hash"]):
        raise AuthError("Invalid email or password.")
    return user
