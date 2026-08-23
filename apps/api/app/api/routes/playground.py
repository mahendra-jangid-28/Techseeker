from fastapi import APIRouter

from app.schemas.playground import CodeExecutionRequest, CodeExecutionResponse
from app.services.runner_service import execute_code_via_runner

router = APIRouter(
    prefix="/api/v1/playground",
    tags=["Playground"],
)


@router.post(
    "/execute",
    response_model=CodeExecutionResponse,
)
async def execute_code(
    payload: CodeExecutionRequest,
) -> CodeExecutionResponse:
    return await execute_code_via_runner(payload)
