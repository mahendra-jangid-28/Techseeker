from typing import Optional

from pydantic import BaseModel


class CodeExecutionRequest(BaseModel):
    language: str
    code: str
    stdin: Optional[str] = None


class CodeExecutionResponse(BaseModel):
    status: str
    stdout: str
    stderr: str
    exit_code: Optional[int] = None
    execution_time_ms: float
    output_truncated: bool
