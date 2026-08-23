from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Project display name")
    language: str = Field(..., description="Programming language ('python', 'javascript', 'cpp')")
    code: str = Field(default="", description="Source code content")


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255, description="Project display name")
    language: Optional[str] = Field(default=None, description="Programming language ('python', 'javascript', 'cpp')")
    code: Optional[str] = Field(default=None, description="Source code content")


class ProjectListItemResponse(BaseModel):
    id: int
    name: str
    language: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProjectDetailResponse(BaseModel):
    id: int
    user_id: int
    name: str
    language: str
    code: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
