from typing import List, Optional
from pydantic import BaseModel


class WeakTopicSnapshot(BaseModel):
    topic: str
    failure_count: int
    confidence: float
    status: str


class LearnerSnapshot(BaseModel):
    user_id: int
    level: int
    xp: int
    streak: int
    active_roadmap: Optional[str] = None
    active_roadmap_id: Optional[int] = None
    roadmap_completion_percentage: int = 0
    completed_topics: List[str] = []
    active_weak_topics: List[WeakTopicSnapshot] = []
    improving_topics: List[str] = []
    resolved_topics: List[str] = []
    recent_learning_context: Optional[str] = None
    learning_velocity: int = 0


class NextBestAction(BaseModel):
    type: str
    title: str
    reason: str
    estimated_minutes: int
    action_url: str = "/learn"
    topic: str


class LearnerRecommendationsResponse(BaseModel):
    next_best_action: NextBestAction
    secondary_recommendations: List[NextBestAction] = []
    weak_topics_to_review: List[str] = []
    continue_learning: Optional[dict] = None
