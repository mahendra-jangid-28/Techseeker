from datetime import datetime, timedelta, UTC

from jose import jwt

from app.core.config import settings


def create_access_token(data: dict) -> str:
    payload = data.copy()

    expire = datetime.now(UTC) + timedelta(minutes=60)

    payload["exp"] = expire

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )