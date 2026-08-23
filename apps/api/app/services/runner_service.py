import httpx
from fastapi import HTTPException

from app.schemas.playground import CodeExecutionRequest, CodeExecutionResponse

RUNNER_SERVICE_URL = "http://127.0.0.1:8001/execute"
REQUEST_TIMEOUT_SECONDS = 15.0
SUPPORTED_LANGUAGES = {"python", "javascript", "cpp"}


async def execute_code_via_runner(
    request_data: CodeExecutionRequest,
) -> CodeExecutionResponse:
    normalized_lang = request_data.language.strip().lower() if request_data.language else ""
    if normalized_lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {request_data.language}",
        )

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(
                RUNNER_SERVICE_URL,
                json=request_data.model_dump(),
            )

        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"Runner service returned status {response.status_code}",
            )

        result = CodeExecutionResponse(**response.json())

        # Map unsupported_language to HTTP 400
        if result.status == "unsupported_language":
            raise HTTPException(
                status_code=400,
                detail=result.stderr or f"Unsupported language: {request_data.language}",
            )

        return result

    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Code execution runner service is unavailable.",
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Code execution request timed out waiting for runner.",
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal error executing code: {str(e)}",
        )
