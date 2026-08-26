from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.progress import UserProgressResponse
from app.schemas.intelligence import LearnerSnapshot, LearnerRecommendationsResponse
from app.services.progress_service import get_user_progress_overview
from app.services.learner_intelligence_service import (
    get_learner_snapshot,
    get_full_recommendations,
)

router = APIRouter(prefix="/users", tags=["Progress"])


@router.get("/progress", response_model=UserProgressResponse)
def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_user_progress_overview(db, current_user)


@router.get("/progress/recommendations", response_model=LearnerRecommendationsResponse)
@router.get("/recommendations/next-best-action", response_model=LearnerRecommendationsResponse)
def get_recommendations_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_full_recommendations(db, current_user.id)


@router.get("/progress/snapshot", response_model=LearnerSnapshot)
def get_snapshot_endpoint(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_learner_snapshot(db, current_user.id)
