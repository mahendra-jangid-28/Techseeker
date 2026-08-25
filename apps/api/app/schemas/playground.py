from typing import Optional
from pydantic import BaseModel


class CodeExecutionRequest(BaseModel):
    language: str = "python"
    code: str
    stdin: Optional[str] = ""


class CodeExecutionResponse(BaseModel):
    stdout: str = ""
    stderr: str = ""
    exit_code: int = 0
    execution_time_ms: int = 0


PlaygroundRunRequest = CodeExecutionRequest
PlaygroundRunResponse = CodeExecutionResponse
