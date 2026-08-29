from typing import List, Optional
from pydantic import BaseModel


class TestCase(BaseModel):
    __test__ = False
    id: int
    input: str
    expected_output: str
    is_hidden: bool = False
    explanation: Optional[str] = None


class TestCaseResult(BaseModel):
    __test__ = False
    id: int
    input: str
    expected_output: str
    actual_output: str
    passed: bool
    execution_time_ms: int
    error: Optional[str] = None
    is_hidden: bool = False


class ChallengeExecutionRequest(BaseModel):
    code: str
    language: str = "python"
    challenge_id: Optional[int] = None
    testcases: Optional[List[TestCase]] = None
    stdin: Optional[str] = None


class ChallengeExecutionResponse(BaseModel):
    passed: bool
    passed_tests: int
    total_tests: int
    stdout: str = ""
    stderr: str = ""
    execution_time_ms: int = 0
    memory_kb: int = 0
    test_results: List[TestCaseResult] = []
    feedback: str = ""
