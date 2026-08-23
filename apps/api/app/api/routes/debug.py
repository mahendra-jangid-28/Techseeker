from fastapi import APIRouter

from app.schemas.debug import CodeDebugRequest, CodeDebugResponse
from app.services.code_debug_service import analyze_code_execution

router = APIRouter(
    prefix="/api/v1/debug",
    tags=["AI Debugger"],
)


@router.post(
    "/analyze",
    response_model=CodeDebugResponse,
)
def analyze_code(
    payload: CodeDebugRequest,
) -> CodeDebugResponse:
    return analyze_code_execution(payload)
