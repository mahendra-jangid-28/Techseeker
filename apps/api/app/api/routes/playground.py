from fastapi import APIRouter

from app.schemas.playground import CodeExecutionRequest, CodeExecutionResponse
from app.services.code_runner_service import execute_sandboxed_code

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
