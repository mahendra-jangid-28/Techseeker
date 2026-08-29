from fastapi import APIRouter

from app.schemas.challenge import (
    ChallengeExecutionRequest,
    ChallengeExecutionResponse,
)
from app.schemas.code_review import (
    AICodeReviewRequest,
    AICodeReviewResponse,
)
from app.schemas.playground import CodeExecutionRequest, CodeExecutionResponse
from app.services.code_debug_service import generate_ai_code_review
from app.services.code_runner_service import (
    execute_challenge_testcases,
    execute_sandboxed_code,
)

router = APIRouter(
    tags=["Playground"],
)


@router.post(
    "/playground/run",
    response_model=CodeExecutionResponse,
)
@router.post(
    "/api/v1/playground/run",
    response_model=CodeExecutionResponse,
)
@router.post(
    "/api/v1/playground/execute",
    response_model=CodeExecutionResponse,
)
async def run_code(
    payload: CodeExecutionRequest,
) -> CodeExecutionResponse:
    """
    Executes Python code in a secure sandboxed environment.
    """
    return execute_sandboxed_code(payload)


@router.post(
    "/playground/testcases",
    response_model=ChallengeExecutionResponse,
)
async def run_challenge_testcases(
    payload: ChallengeExecutionRequest,
) -> ChallengeExecutionResponse:
    """
    Executes code against multiple challenge test cases and returns pass/fail metrics.
    """
    return execute_challenge_testcases(payload)


@router.post(
    "/playground/review",
    response_model=AICodeReviewResponse,
)
async def review_code_submission(
    payload: AICodeReviewRequest,
) -> AICodeReviewResponse:
    """
    Generates an in-depth structured AI Code Review evaluating logic, bugs, complexity, and hints.
    """
    return generate_ai_code_review(payload)
