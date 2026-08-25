from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse
from app.schemas.memory import (
    StudyRecommendationResponse,
    UserMemoryResponse,
    WeakTopicResponse,
)
from app.services.memory_service import (
    get_active_weak_topics,
    get_user_memories,
)
from app.services.recommendation_service import (
    get_recommendations,
    refresh_recommendations as refresh_recommendations_service,
)

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.get("/memory", response_model=UserMemoryResponse)
def get_memory(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    memories = get_user_memories(db, current_user.id)
    return UserMemoryResponse(memories=memories)


@router.get("/weak-topics", response_model=WeakTopicResponse)
def get_weak_topics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    weak_topics = get_active_weak_topics(db, current_user.id)
    return WeakTopicResponse(weak_topics=weak_topics)


@router.get("/recommendations", response_model=StudyRecommendationResponse)
def get_study_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recs = get_recommendations(db, current_user.id)
    return StudyRecommendationResponse(recommendations=recs)


@router.post("/recommendations/refresh", response_model=StudyRecommendationResponse)
def refresh_study_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    recs = refresh_recommendations_service(db, current_user.id)
    return StudyRecommendationResponse(recommendations=recs)