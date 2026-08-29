import sys
sys.path.insert(0, ".")
from fastapi.testclient import TestClient
from app.main import app

def test_playground_runner():
    client = TestClient(app)

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

    # 5. Test user exact scenario: name input + int(number input) with CRLF & LF
    user_code = """
name = input("Enter your name: ")
print(f"Hello, {name}!")
num = int(input("Enter a number: "))
print(f"Number is: {num}")
"""
    for line_ending in ["\r\n", "\n"]:
        payload5 = {
            "language": "python",
            "code": user_code,
            "stdin": f"hello{line_ending}42{line_ending}",
        }
        res5 = client.post("/playground/run", json=payload5)
        assert res5.status_code == 200
        data5 = res5.json()
        print(f"User Scenario ({repr(line_ending)}) Result:", data5)
        assert data5["exit_code"] == 0, f"Failed with stderr: {data5['stderr']}"
        assert "Hello, hello!" in data5["stdout"]
        assert "Number is: 42" in data5["stdout"]
        assert data5["stderr"] == ""

    # 6. Test multiple sequential input() calls with 3+ distinct values of different lengths
    multi_input_code = """
v1 = input("Prompt 1: ")
v2 = input("Prompt 2: ")
v3 = input("Prompt 3: ")
print(f"R1:[{v1}]|R2:[{v2}]|R3:[{v3}]")
"""
    # Test with varying lengths: "hello" (5 chars), "42" (2 chars), "a longer string here" (20 chars)
    payload6 = {
        "language": "python",
        "code": multi_input_code,
        "stdin": "hello\r\n42\r\na longer string here\r\n",
    }
    res6 = client.post("/playground/run", json=payload6)
    assert res6.status_code == 200
    data6 = res6.json()
    print("Multiple Input Test Result:", data6)
    assert data6["exit_code"] == 0
    assert "R1:[hello]|R2:[42]|R3:[a longer string here]" in data6["stdout"]
    assert data6["stderr"] == ""

    # 7. Test large integer-to-string conversion cap (factorial > 4300 digits)
    large_int_code = """
import math
fact = math.factorial(2000)
fact_str = str(fact)
print(f"Digits: {len(fact_str)}")
print(f"Starts with: {fact_str[:10]}")
print(f"Ends with: {fact_str[-10:]}")
"""
    payload7 = {
        "language": "python",
        "code": large_int_code,
        "stdin": "",
    }
    res7 = client.post("/playground/run", json=payload7)
    assert res7.status_code == 200
    data7 = res7.json()
    print("Large Integer Test Result:", data7)
    assert data7["exit_code"] == 0, f"Large int execution failed: {data7['stderr']}"
    assert "Digits: 5736" in data7["stdout"]
    assert data7["stderr"] == ""
    assert data7["execution_time_ms"] < 2000  # Well within 2s timeout

    print("\n[SUCCESS] PLAYGROUND CODE RUNNER, STDIN & LARGE INT STR DIGITS VERIFIED 100%!")

if __name__ == "__main__":
    test_playground_runner()

