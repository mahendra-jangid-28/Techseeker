import os
import sys
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, ".")
os.environ["TEST_MODE"] = "1"

from app.db.database import Base
from app.db.dependencies import get_db
import app.models  # Register all tables
from app.main import app
from app.models.user import User

# In-memory test db for google auth tests
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def apply_db_override():
    original_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db
    yield
    if original_override is not None:
        app.dependency_overrides[get_db] = original_override
    else:
        app.dependency_overrides.pop(get_db, None)


client = TestClient(app)


def test_google_oauth_new_user_registration():
    """Test registering a brand new user via Google OAuth ID Token."""
    mock_payload = {
        "iss": "https://accounts.google.com",
        "sub": "google-user-12345",
        "email": "newuser@techseeker.dev",
        "email_verified": True,
        "name": "Jane Google",
        "picture": "https://lh3.googleusercontent.com/a/jane_avatar.png",
    }

    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        response = client.post(
            "/auth/oauth/google",
            json={"idToken": "fake-valid-google-id-token"},
        )

        assert response.status_code == 200, response.text
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["email"] == "newuser@techseeker.dev"
        assert data["user"]["full_name"] == "Jane Google"
        assert data["user"]["auth_provider"] == "google"
        assert data["user"]["profile_picture_url"] == "https://lh3.googleusercontent.com/a/jane_avatar.png"

        # Verify DB state
        db = TestingSessionLocal()
        db_user = db.query(User).filter(User.email == "newuser@techseeker.dev").first()
        assert db_user is not None
        assert db_user.hashed_password is None
        assert db_user.auth_provider == "google"
        assert db_user.profile_picture_url == "https://lh3.googleusercontent.com/a/jane_avatar.png"
        db.close()


def test_google_oauth_existing_google_user_login():
    """Test that an existing Google OAuth user can log back in seamlessly."""
    mock_payload = {
        "iss": "accounts.google.com",
        "sub": "google-user-12345",
        "email": "newuser@techseeker.dev",
        "email_verified": True,
        "name": "Jane Google",
        "picture": "https://lh3.googleusercontent.com/a/jane_avatar.png",
    }

    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_payload):
        response = client.post(
            "/auth/oauth/google",
            json={"idToken": "another-valid-google-id-token"},
        )

        assert response.status_code == 200, response.text
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "newuser@techseeker.dev"


def test_google_oauth_account_linking_for_existing_local_user():
    """
    Test edge case: A user originally signed up with email/password.
    When they subsequently log in with Google using that verified email,
    the account is safely linked and both Google OAuth and standard login work.
    """
    # 1. Register local email/password user
    local_reg = client.post(
        "/auth/register",
        json={
            "email": "localdev@techseeker.dev",
            "password": "LocalPassword123!",
            "full_name": "Local Developer",
        },
    )
    assert local_reg.status_code == 200, local_reg.text

    # 2. Authenticate with Google using the same email
    mock_google_payload = {
        "iss": "https://accounts.google.com",
        "sub": "google-sub-7890",
        "email": "localdev@techseeker.dev",
        "email_verified": True,
        "name": "Local Developer",
        "picture": "https://lh3.googleusercontent.com/a/dev_avatar.png",
    }

    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=mock_google_payload):
        google_res = client.post(
            "/auth/oauth/google",
            json={"idToken": "google-token-matching-local-email"},
        )
        assert google_res.status_code == 200, google_res.text
        google_data = google_res.json()
        assert google_data["user"]["email"] == "localdev@techseeker.dev"
        assert "access_token" in google_data

    # 3. Confirm the user can still log in using their original email/password
    login_res = client.post(
        "/auth/login",
        data={
            "username": "localdev@techseeker.dev",
            "password": "LocalPassword123!",
        },
    )
    assert login_res.status_code == 200, login_res.text
    assert "access_token" in login_res.json()


def test_google_oauth_invalid_token_error():
    """Test that invalid Google ID tokens return HTTP 401."""
    with patch(
        "google.oauth2.id_token.verify_oauth2_token",
        side_effect=ValueError("Token expired or audience mismatch"),
    ):
        response = client.post(
            "/auth/oauth/google",
            json={"idToken": "expired-or-invalid-token"},
        )
        assert response.status_code == 401
        assert "Invalid Google ID token" in response.json()["detail"]


def test_google_oauth_unverified_email_error():
    """Test that Google accounts without email_verified=True are rejected with 400."""
    unverified_payload = {
        "iss": "https://accounts.google.com",
        "sub": "google-sub-999",
        "email": "unverified@techseeker.dev",
        "email_verified": False,
        "name": "Unverified User",
    }

    with patch("google.oauth2.id_token.verify_oauth2_token", return_value=unverified_payload):
        response = client.post(
            "/auth/oauth/google",
            json={"idToken": "unverified-token"},
        )
        assert response.status_code == 400
        assert "Google email address is not verified" in response.json()["detail"]


def test_google_oauth_empty_request_body_validation():
    """Test that empty or missing idToken returns validation error."""
    response = client.post(
        "/auth/oauth/google",
        json={},
    )
    assert response.status_code == 422
