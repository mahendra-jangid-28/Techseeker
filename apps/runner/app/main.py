from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel

from app.executor import CodeExecutor

app = FastAPI(
    title="TechSeeker Code Runner",
    version="1.0.0",
)

executor = CodeExecutor()


class ExecutionRequest(BaseModel):
    language: str
    code: str
    stdin: Optional[str] = None


class ExecutionResponse(BaseModel):
    status: str
    stdout: str
    stderr: str
    exit_code: Optional[int] = None
    execution_time_ms: float
    output_truncated: bool


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "code-runner",
    }


@app.post("/execute", response_model=ExecutionResponse)
async def execute_code(request: ExecutionRequest):
    result = await executor.execute(
        language=request.language,
        code=request.code,
        stdin=request.stdin,
    )
    return result
