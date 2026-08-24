from typing import List, Optional
from pydantic import BaseModel


class ModuleItemResponse(BaseModel):
    id: int
    roadmap_id: int
    title: str
    description: str
    order_index: int
    estimated_hours: int
    status: str  # 'locked', 'unlocked', 'completed'

    model_config = {
        "from_attributes": True
    }


class RoadmapSummaryResponse(BaseModel):
    id: int
    title: str
    description: str
    difficulty: str
    estimated_weeks: int
    total_modules: int

    model_config = {
        "from_attributes": True
    }


class UserRoadmapDetailResponse(BaseModel):
    id: int
    title: str
    description: str
    difficulty: str
    estimated_weeks: int
    progress_percentage: int
    completed_modules_count: int
    total_modules_count: int
    modules: List[ModuleItemResponse]


class SelectRoadmapRequest(BaseModel):
    roadmap_id: int
