import logging
from typing import Any
from fastapi import HTTPException, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.repositories.user_repository import (
    create_user,
    get_user_by_email,
    update_user,
)
from app.schemas.token import Token
from app.schemas.user import UserResponse
from app.security.token import create_access_token

logger = logging.getLogger("techseeker.auth")


def verify_google_id_token(id_token_str: str) -> dict[str, Any]:
    """
    Verifies a Google OAuth 2.0 ID Token server-side using Google's public keys.
    Validates token audience against GOOGLE_CLIENT_ID if configured.
    """
    if not id_token_str or not id_token_str.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google ID token is required",
        )

    try:
        request = google_requests.Request()
        audience = settings.GOOGLE_CLIENT_ID if settings.GOOGLE_CLIENT_ID else None
        
        # Verify the token with Google
        payload = google_id_token.verify_oauth2_token(
            id_token_str,
            request,
            audience=audience,
        )

        # Validate issuer
        if payload.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Invalid issuer")

        return payload

    except ValueError as exc:
        logger.warning(f"Google token verification failed: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Google ID token: {str(exc)}",
        )
    except Exception as exc:
        logger.error(f"Unexpected error verifying Google ID token: {exc}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not verify Google ID token",
        )


def authenticate_or_register_google_user(db: Session, id_token_str: str) -> Token:
    """
    Handles Google OAuth authentication:
    1. Verifies the Google ID token.
    2. Extracts profile (email, name, sub, picture).
    3. Looks up existing user:
       - If user exists (e.g. registered via local email/password): links the account seamlessly.
       - If user does not exist: creates a new user with auth_provider='google' and nullable password.
    4. Issues standard TechSeeker JWT access token.
    """
    payload = verify_google_id_token(id_token_str)

    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not provide an email address",
        )

    email_verified = payload.get("email_verified", False)
    if not email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google email address is not verified",
        )

    name = payload.get("name") or payload.get("given_name") or email.split("@")[0]
    picture = payload.get("picture")

    # Look up user by email in repository
    user = get_user_by_email(db, email)

    if user:
        # User already exists - link Google identity
        logger.info(f"Existing user {email} (provider: {user.auth_provider}) logged in via Google OAuth")
        
        updated = False
        if picture and not user.profile_picture_url:
            user.profile_picture_url = picture
            updated = True
        
        # If user was created without a name or placeholder name
        if not user.full_name and name:
            user.full_name = name
            updated = True

        if updated:
            user = update_user(db, user)
    else:
        # New user registration via Google OAuth
        logger.info(f"Registering new user {email} via Google OAuth")
        new_user = User(
            email=email,
            full_name=name,
            hashed_password=None,
            auth_provider="google",
            profile_picture_url=picture,
        )
        user = create_user(db, new_user)

    # Issue standard JWT access token
    access_token = create_access_token(
        {
            "sub": user.email,
            "user_id": user.id,
        }
    )

    user_response = UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        auth_provider=user.auth_provider,
        profile_picture_url=user.profile_picture_url,
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        token=access_token,
        user=user_response,
    )
