from typing import Optional
from pydantic import BaseModel, Field


class CodeDebugRequest(BaseModel):
    language: str
    code: str
    stdout: str = ""
    stderr: str = ""
    exit_code: Optional[int] = None


class CodeDebugResponse(BaseModel):
    summary: str = Field(..., description="High-level 1-2 sentence overview of the execution/code analysis")
    error_type: str = Field(..., description="Type of error (e.g. 'IndexError', 'SyntaxError', 'None / Clean Execution', 'Time Limit Exceeded')")
    explanation: str = Field(..., description="Beginner-friendly explanation of what occurred in the code")
    fix: str = Field(..., description="Actionable guidance on how to resolve or improve the code")
    improved_code: str = Field(..., description="Clean, idiomatic, improved version of the code preserving original intent")
    complexity: str = Field(..., description="Time and space complexity analysis (e.g. 'O(n) time, O(1) space')")
    tips: list[str] = Field(default_factory=list, description="List of practical tips and best practices for the learner")
