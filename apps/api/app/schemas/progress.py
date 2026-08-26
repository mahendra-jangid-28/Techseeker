from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ContinueLearningItem(BaseModel):
    topic: str
    progress: int


class DailyActivity(BaseModel):
    day: str
    minutes: int
    activities_count: int = 0


class HeatmapDay(BaseModel):
    date: str
    day: str
    count: int
    level: int


class RecentActivityItem(BaseModel):
    id: int
    activity_type: str
    activity_title: str
    xp_earned: int
    created_at: datetime

    model_config = {
        "from_attributes": True
    }


class UserProgressResponse(BaseModel):
    name: str
    xp: int
    level: int
    streak: int
    lessons_completed: int = 0
    roadmap_progress_percentage: int = 0
    quizzes_completed: int = 0
    challenges_passed: int = 0
    active_weak_topics_count: int = 0
    resolved_topics_count: int = 0
    continue_learning: Optional[ContinueLearningItem] = None
    weekly_activity: List[DailyActivity] = []
    heatmap: List[List[int]] = []
    heatmap_days: List[HeatmapDay] = []
    recent_activity: List[RecentActivityItem] = []
