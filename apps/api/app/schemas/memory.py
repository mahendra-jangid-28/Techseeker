from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class UserMemoryItem(BaseModel):
    id: int
    memory_key: str
    memory_value: str
    memory_type: str
    importance: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserMemoryResponse(BaseModel):
    memories: List[UserMemoryItem]


class WeakTopicItem(BaseModel):
    id: int
    topic: str
    failure_count: int
    successful_attempts: int
    attempt_count: int
    confidence: float
    status: str
    last_failed_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WeakTopicResponse(BaseModel):
    weak_topics: List[WeakTopicItem]


class StudyRecommendationItem(BaseModel):
    id: int
    recommendation_type: str
    title: str
    description: str
    topic: str
    priority: int
    reason: str
    action_url: Optional[str] = None
    status: str
    recommended_for: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class StudyRecommendationResponse(BaseModel):
    recommendations: List[StudyRecommendationItem]
