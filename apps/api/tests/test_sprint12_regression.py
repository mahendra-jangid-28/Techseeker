import pytest
from unittest.mock import MagicMock, patch
from fastapi import FastAPI
from fastapi.testclient import TestClient
from google.genai.errors import ServerError

from app.main import app
from app.providers.gemini_provider import GeminiProvider
from app.core.config import settings


def test_global_500_error_handling():
    """
    Test 1 — Global 500 Envelope
    Verifies that unhandled server exceptions return a sanitized 500 JSON envelope,
    attach X-Request-ID and security headers, and do not leak internal exception details.
    """
    # Create isolated test route that raises unhandled exception
    @app.get("/test-unhandled-error-endpoint")
    def trigger_unhandled_error():
        raise RuntimeError("Internal database connection dropped: secret_token_xyz")

    client = TestClient(app, raise_server_exceptions=False)
    response = client.get("/test-unhandled-error-endpoint")

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal server error"}
    assert "X-Request-ID" in response.headers
    assert len(response.headers["X-Request-ID"]) > 0
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "secret_token_xyz" not in response.text
    assert "RuntimeError" not in response.text


def test_request_validation_422_envelope():
    """
    Test 2 — 422 Validation Envelope
    Verifies that invalid request payloads return HTTP 422 with structured detail list,
    X-Request-ID, and security headers.
    """
    client = TestClient(app)
    response = client.post("/auth/register", json={})

    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    assert isinstance(data["detail"], list)
    assert len(data["detail"]) > 0
    assert "X-Request-ID" in response.headers
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"


def test_gemini_pre_chunk_failover():
    """
    Test 3 — Gemini Pre-Chunk Failover
    Verifies that if Key 1 encounters a server error before emitting any chunks,
    the provider fails over to Key 2 and delivers output.
    """
    provider = GeminiProvider()
    provider.api_keys = ["mock_key_1", "mock_key_2"]

    attempted_keys = []

    class MockClientPreChunk:
        def __init__(self, api_key):
            self.api_key = api_key
            attempted_keys.append(api_key)
            self.models = MagicMock()

            def mock_stream(**kwargs):
                if self.api_key == "mock_key_1":
                    raise ServerError(503, "Key 1 Service Unavailable")
                chunk = MagicMock()
                chunk.text = "Output from Key 2"
                return iter([chunk])

            self.models.generate_content_stream = mock_stream

    with patch("google.genai.Client", side_effect=MockClientPreChunk):
        chunks = list(
            provider.stream_generate(
                [{"role": "user", "parts": [{"text": "Hello"}]}]
            )
        )

        assert attempted_keys == ["mock_key_1", "mock_key_2"]
        assert chunks == ["Output from Key 2"]


def test_gemini_mid_stream_no_failover():
    """
    Test 4 — Gemini Mid-Stream No-Failover
    Verifies that if Key 1 emits at least one chunk and then fails,
    failover is prevented, Key 2 is NOT attempted, and the exception is propagated.
    """
    provider = GeminiProvider()
    provider.api_keys = ["mock_key_1", "mock_key_2"]

    attempted_keys = []

    def mock_failing_stream():
        chunk = MagicMock()
        chunk.text = "First Chunk"
        yield chunk
        raise ServerError(503, "Mid-stream connection dropped")

    class MockClientMidStream:
        def __init__(self, api_key):
            self.api_key = api_key
            attempted_keys.append(api_key)
            self.models = MagicMock()
            self.models.generate_content_stream = lambda **kwargs: mock_failing_stream()

    with patch("google.genai.Client", side_effect=MockClientMidStream):
        received_chunks = []
        exception_raised = False

        try:
            for chunk in provider.stream_generate(
                [{"role": "user", "parts": [{"text": "Hello"}]}]
            ):
                received_chunks.append(chunk)
        except ServerError:
            exception_raised = True

        assert exception_raised is True
        assert received_chunks == ["First Chunk"]
        assert attempted_keys == ["mock_key_1"]  # mock_key_2 was NOT attempted


def test_cors_configuration():
    """
    Test 5 — CORS Configuration Regression
    Verifies that configured origins (localhost:3000, 127.0.0.1:3000) are allowed,
    while untrusted origins (evil.example.com) are rejected.
    """
    client = TestClient(app)

    # 1. Allowed localhost:3000
    res_local = client.options(
        "/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_local.headers.get("access-control-allow-origin") == "http://localhost:3000"

    # 2. Allowed 127.0.0.1:3000
    res_ip = client.options(
        "/health",
        headers={
            "Origin": "http://127.0.0.1:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_ip.headers.get("access-control-allow-origin") == "http://127.0.0.1:3000"

    # 3. Rejected untrusted origin
    res_untrusted = client.options(
        "/health",
        headers={
            "Origin": "http://evil.example.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert res_untrusted.headers.get("access-control-allow-origin") is None
