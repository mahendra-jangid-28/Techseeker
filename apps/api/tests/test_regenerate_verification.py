import httpx
import pytest

def test_regenerate_response():
    try:
        health = httpx.get("http://127.0.0.1:8000/health", timeout=1.0)
        if health.status_code != 200:
            pytest.skip("Live backend server not running at localhost:8000")
    except Exception:
        pytest.skip("Live backend server not running at localhost:8000")

    client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=35.0)

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
        json={"title": "Regenerate Test"},
        headers=headers,
    )
    assert conv_res.status_code == 200
    conv_id = conv_res.json()["id"]

    # 3. Send initial user message
    msg_res = client.post(
        f"/chat/conversations/{conv_id}/messages",
        json={"content": "Explain Python lambda functions in 2 short bullet points."},
        headers=headers,
    )
    assert msg_res.status_code == 200
    chat_data = msg_res.json()
    user_msg = chat_data["user_message"]
    old_assistant_msg = chat_data["assistant_message"]

    assert user_msg["role"] == "user"
    assert old_assistant_msg["role"] == "assistant"
    assert old_assistant_msg["is_current"] is True
    print(f"Old Assistant Message ID: {old_assistant_msg['id']}")
    print(f"Old Assistant Content:\n{old_assistant_msg['content']}\n")

    # 4. Call Regenerate Endpoint
    regen_res = client.post(
        f"/chat/messages/{old_assistant_msg['id']}/regenerate",
        headers=headers,
    )
    assert regen_res.status_code == 200, f"Regenerate failed: {regen_res.text}"
    new_assistant_msg = regen_res.json()

    print(f"New Regenerated Message ID: {new_assistant_msg['id']}")
    print(f"New Regenerated Content:\n{new_assistant_msg['content']}\n")

    assert new_assistant_msg["role"] == "assistant"
    assert new_assistant_msg["is_current"] is True
    assert new_assistant_msg["parent_message_id"] == old_assistant_msg["id"]
    assert new_assistant_msg["id"] != old_assistant_msg["id"]

    # 5. Fetch conversation details: should only return current messages (no duplicates)
    detail_res = client.get(
        f"/chat/conversations/{conv_id}",
        headers=headers,
    )
    assert detail_res.status_code == 200
    detail = detail_res.json()
    visible_messages = detail["messages"]

    assert len(visible_messages) == 2, f"Expected 2 visible messages, got {len(visible_messages)}"
    assert visible_messages[0]["id"] == user_msg["id"]
    assert visible_messages[1]["id"] == new_assistant_msg["id"]
    assert visible_messages[1]["content"] == new_assistant_msg["content"]
    assert not any(m["id"] == old_assistant_msg["id"] for m in visible_messages), "Old message should not be visible in active messages"

    # 6. Verify error handling: invalid ID and regenerating a user message
    err_res_1 = client.post("/chat/messages/999999/regenerate", headers=headers)
    assert err_res_1.status_code == 404

    err_res_2 = client.post(f"/chat/messages/{user_msg['id']}/regenerate", headers=headers)
    assert err_res_2.status_code == 404

    print("[SUCCESS] REGENERATE RESPONSE VERIFICATION PASSED 100%!")

if __name__ == "__main__":
    test_regenerate_response()
