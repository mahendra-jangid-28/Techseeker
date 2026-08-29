from typing import List, Optional
from pydantic import BaseModel


class AICodeReviewRequest(BaseModel):
    code: str
    language: str = "python"
    prompt: Optional[str] = ""
    stdout: Optional[str] = ""
    stderr: Optional[str] = ""


class AICodeReviewResponse(BaseModel):
    logic_analysis: str
    readability_score: int
    readability_feedback: str
    detected_bugs: List[str]
    edge_cases: List[str]
    better_approach: str
    time_complexity: str
    space_complexity: str
    hint_ladder: List[str]
    overall_verdict: str
