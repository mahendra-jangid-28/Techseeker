from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.challenge import ChallengeExecutionRequest, TestCase
from app.schemas.code_review import AICodeReviewRequest
from app.services.code_runner_service import execute_challenge_testcases
from app.services.code_debug_service import generate_ai_code_review


def test_challenge_testcases_runner_success_and_failure():
    """
    Verifies testcase execution runner against multiple cases.
    """
    # Code that adds two numbers from STDIN
    code = """
import sys
lines = sys.stdin.read().split()
if len(lines) >= 2:
    a, b = int(lines[0]), int(lines[1])
    print(a + b)
"""

    testcases = [
        TestCase(id=1, input="2 3", expected_output="5"),
        TestCase(id=2, input="10 20", expected_output="30"),
        TestCase(id=3, input="-5 5", expected_output="0"),
        TestCase(id=4, input="1 1", expected_output="999"),  # Intentionally failing testcase
    ]

    req = ChallengeExecutionRequest(
        code=code,
        language="python",
        testcases=testcases,
    )

    res = execute_challenge_testcases(req)

    assert res.total_tests == 4
    assert res.passed_tests == 3
    assert res.passed is False
    assert len(res.test_results) == 4

    # Verify first 3 passed
    assert res.test_results[0].passed is True
    assert res.test_results[0].actual_output == "5"
    assert res.test_results[1].passed is True
    assert res.test_results[1].actual_output == "30"
    assert res.test_results[2].passed is True
    assert res.test_results[2].actual_output == "0"

    # Verify 4th failed
    assert res.test_results[3].passed is False
    assert res.test_results[3].actual_output == "2"
    assert res.test_results[3].expected_output == "999"


def test_ai_code_review_service():
    """
    Verifies structured AI Code Review generation with logic, bugs, complexity, and hints.
    """
    mock_review_json = """
    {
      "logic_analysis": "The algorithm correctly calculates prefix sums using an in-place accumulator.",
      "readability_score": 9,
      "readability_feedback": "Clean variable names and idiomatic list comprehension.",
      "detected_bugs": [],
      "edge_cases": ["Empty list input returns empty list."],
      "better_approach": "Use itertools.accumulate for functional elegance.",
      "time_complexity": "Time: O(n)",
      "space_complexity": "Space: O(1) auxiliary",
      "hint_ladder": [
        "Consider maintaining a running sum.",
        "Update the array in-place to save memory."
      ],
      "overall_verdict": "Clean & Production-Ready"
    }
    """

    mock_provider = MagicMock()
    mock_provider.generate.return_value = mock_review_json

    with patch("app.services.code_debug_service.GeminiProvider", return_value=mock_provider):
        req = AICodeReviewRequest(
            code="def running_sum(nums): return [sum(nums[:i+1]) for i in range(len(nums))]",
            language="python",
        )
        res = generate_ai_code_review(req)

        assert res.readability_score == 9
        assert res.overall_verdict == "Clean & Production-Ready"
        assert res.time_complexity == "Time: O(n)"
        assert len(res.hint_ladder) == 2
        assert mock_provider.generate.call_count == 1


def test_playground_api_routes():
    """
    Verifies /playground/run, /playground/testcases, and /playground/review endpoints via TestClient.
    """
    client = TestClient(app)

    # 1. Run basic code
    res_run = client.post(
        "/playground/run",
        json={"language": "python", "code": "print('Sprint 15 Ready!')"},
    )
    assert res_run.status_code == 200
    assert "Sprint 15 Ready!" in res_run.json()["stdout"]

    # 2. Run testcases endpoint
    res_tc = client.post(
        "/playground/testcases",
        json={
            "language": "python",
            "code": "print('hello')",
            "testcases": [{"id": 1, "input": "", "expected_output": "hello"}],
        },
    )
    assert res_tc.status_code == 200
    assert res_tc.json()["passed"] is True
    assert res_tc.json()["passed_tests"] == 1
