import httpx
import pytest

def test_sse_streaming():
    try:
        health = httpx.get("http://127.0.0.1:8000/health", timeout=1.0)
        if health.status_code != 200:
            pytest.skip("Live backend server not running at localhost:8000")
    except Exception:
        pytest.skip("Live backend server not running at localhost:8000")

    client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=30.0)
    
    # 1. Login
    login_res = client.post(
        "/auth/login",
        data={
            "username": "test_sprint8b@techseeker.dev",
            "password": "Password123!",
        },
    )
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create conversation
    conv_res = client.post(
        "/chat/conversations",
        json={"title": "SSE Streaming Verification"},
        headers=headers,
    )
    assert conv_res.status_code == 200, f"Create conv failed: {conv_res.text}"
    conv_id = conv_res.json()["id"]
    print(f"Conversation ID: {conv_id}")
    
    # 3. Stream chat
    events = []
    with client.stream(
        "POST",
        f"/chat/conversations/{conv_id}/stream",
        json={"content": "List 3 colors in Python list format."},
        headers=headers,
    ) as response:
        assert response.status_code == 200, f"Stream failed with {response.status_code}"
        assert "text/event-stream" in response.headers.get("content-type", "")
        print(f"Status: {response.status_code}, Media-Type: {response.headers.get('content-type')}")
        
        for line in response.iter_lines():
            if line:
                print(f"SSE Line: {line}")
                events.append(line)
                
    assert any("data:" in e for e in events), "Expected data chunks in SSE output"
    assert "event: done" in events or any("[DONE]" in e for e in events), "Expected done event in SSE output"
    
    # 4. Verify conversation messages persisted in database
    detail_res = client.get(f"/chat/conversations/{conv_id}", headers=headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    messages = detail["messages"]
    assert len(messages) == 2, f"Expected 2 messages (user and assistant), got {len(messages)}"
    assert messages[0]["role"] == "user"
    assert messages[1]["role"] == "assistant"
    assert len(messages[1]["content"]) > 0, "Assistant response should not be empty"
    print(f"Assistant Message Persisted: {messages[1]['content']}")
    
    print("\n[SUCCESS] SSE STREAMING CHAT VERIFICATION PASSED!")

if __name__ == "__main__":
    test_sse_streaming()
