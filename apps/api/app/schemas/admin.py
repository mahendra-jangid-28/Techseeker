from typing import Any, Dict, List
from pydantic import BaseModel


class TopicPopularity(BaseModel):
    topic: str
    count: int


class DailyActivityPoint(BaseModel):
    date: str
    events_count: int


class AdminAnalyticsResponse(BaseModel):
    total_users: int
    active_users: int
    lessons_completed: int
    ai_requests: int
    popular_topics: List[TopicPopularity]
    completion_rate: float
    xp_distribution: Dict[str, int]
    daily_activity: List[DailyActivityPoint]
    total_projects: int
    certificates_issued: int
