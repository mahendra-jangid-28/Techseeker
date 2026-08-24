from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class ContinueLearningItem(BaseModel):
    topic: str
    progress: int


class DailyActivity(BaseModel):
    day: str
    minutes: int


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
    continue_learning: Optional[ContinueLearningItem] = None
    weekly_activity: List[DailyActivity] = []
    recent_activity: List[RecentActivityItem] = []
