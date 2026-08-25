import httpx

def test_playground_runner():
    client = httpx.Client(base_url="http://127.0.0.1:8000", timeout=10.0)

    # 1. Test basic code execution
    payload1 = {
        "language": "python",
        "code": "print('Hello from TechSeeker')",
        "stdin": "",
    }
    res1 = client.post("/playground/run", json=payload1)
    assert res1.status_code == 200, f"Run failed: {res1.text}"
    data1 = res1.json()
    print("Test 1 Result:", data1)
    assert data1["stdout"].strip() == "Hello from TechSeeker"
    assert data1["exit_code"] == 0
    assert "execution_time_ms" in data1

    # 2. Test input/stdin
    payload2 = {
        "language": "python",
        "code": "val = input()\nprint(f'Echo: {val}')",
        "stdin": "Testing Stdin Support",
    }
    res2 = client.post("/playground/run", json=payload2)
    assert res2.status_code == 200, f"Run with stdin failed: {res2.text}"
    data2 = res2.json()
    print("Test 2 Result:", data2)
    assert data2["stdout"].strip() == "Echo: Testing Stdin Support"
    assert data2["exit_code"] == 0

    # 3. Test runtime error / exception capture in stderr
    payload3 = {
        "language": "python",
        "code": "x = 10 / 0",
        "stdin": "",
    }
    res3 = client.post("/playground/run", json=payload3)
    assert res3.status_code == 200
    data3 = res3.json()
    print("Test 3 Result:", data3)
    assert data3["exit_code"] != 0
    assert "ZeroDivisionError" in data3["stderr"]

    # 4. Test timeout limit (2.0s)
    payload4 = {
        "language": "python",
        "code": "import time\ntime.sleep(5)",
        "stdin": "",
    }
    res4 = client.post("/playground/run", json=payload4)
    assert res4.status_code == 200
    data4 = res4.json()
    print("Test 4 Result:", data4)
    assert data4["exit_code"] == 124 or "timed out" in data4["stderr"].lower()

    print("\n[SUCCESS] SPRINT 10A PLAYGROUND CODE RUNNER VERIFIED 100%!")

if __name__ == "__main__":
    test_playground_runner()
