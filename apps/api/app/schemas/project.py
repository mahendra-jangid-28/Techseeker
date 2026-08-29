from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProjectEvaluationRubric(BaseModel):
    functionality_score: int  # 0-100
    functionality_feedback: str
    code_quality_score: int  # 0-100
    code_quality_feedback: str
    architecture_score: int  # 0-100
    architecture_feedback: str
    readability_score: int  # 0-100
    readability_feedback: str
    documentation_score: int  # 0-100
    documentation_feedback: str
    ui_ux_feedback: Optional[str] = None
    suggestions: List[str] = []
    final_score: int  # 0-100
    passed: bool = True
    summary: str


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Project display name")
    language: str = Field(default="python", description="Primary language")
    description: Optional[str] = Field(default="", description="Project summary description")
    category: Optional[str] = Field(default="Full Stack", description="Project category")
    difficulty: Optional[str] = Field(default="Intermediate", description="Beginner/Intermediate/Advanced")
    tech_stack: Optional[str] = Field(default="Python, FastAPI, SQLite", description="Key technologies")
    github_url: Optional[str] = Field(default=None, description="GitHub repository URL")
    live_demo_url: Optional[str] = Field(default=None, description="Live deployment URL")
    thumbnail: Optional[str] = Field(default=None, description="Thumbnail preview URL")
    code: str = Field(default="", description="Primary source code content")
    files: Optional[Dict[str, str]] = Field(default_factory=dict, description="Multi-file map")
    status: Optional[str] = Field(default="draft", description="draft / submitted / completed")


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    language: Optional[str] = Field(default=None)
    description: Optional[str] = Field(default=None)
    category: Optional[str] = Field(default=None)
    difficulty: Optional[str] = Field(default=None)
    tech_stack: Optional[str] = Field(default=None)
    github_url: Optional[str] = Field(default=None)
    live_demo_url: Optional[str] = Field(default=None)
    thumbnail: Optional[str] = Field(default=None)
    code: Optional[str] = Field(default=None)
    files: Optional[Dict[str, str]] = Field(default=None)
    status: Optional[str] = Field(default=None)


class ProjectListItemResponse(BaseModel):
    id: int
    user_id: int
    name: str
    language: str
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    tech_stack: Optional[str] = None
    github_url: Optional[str] = None
    live_demo_url: Optional[str] = None
    thumbnail: Optional[str] = None
    status: str
    score: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectDetailResponse(BaseModel):
    id: int
    user_id: int
    name: str
    language: str
    description: Optional[str] = None
    category: Optional[str] = None
    difficulty: Optional[str] = None
    tech_stack: Optional[str] = None
    github_url: Optional[str] = None
    live_demo_url: Optional[str] = None
    thumbnail: Optional[str] = None
    code: str
    files: Optional[Dict[str, str]] = None
    status: str
    score: Optional[int] = None
    review_json: Optional[Dict] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
