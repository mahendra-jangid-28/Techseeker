from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.roadmap import (
    RoadmapSummaryResponse,
    SelectRoadmapRequest,
    UserRoadmapDetailResponse,
)
from app.services.roadmap_service import (
    complete_module as complete_module_service,
    get_all_roadmaps as get_all_roadmaps_service,
    get_user_roadmap as get_user_roadmap_service,
    select_roadmap as select_roadmap_service,
)

router = APIRouter(prefix="/roadmaps", tags=["Roadmaps"])


@router.get("", response_model=List[RoadmapSummaryResponse])
def get_roadmaps(db: Session = Depends(get_db)):
    return get_all_roadmaps_service(db)


@router.get("/me", response_model=Optional[UserRoadmapDetailResponse])
def get_my_roadmap(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_user_roadmap_service(db, current_user.id)


@router.post("/select", response_model=UserRoadmapDetailResponse)
def select_roadmap(
    data: SelectRoadmapRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return select_roadmap_service(db, current_user.id, data.roadmap_id)


@router.post("/modules/{id}/complete", response_model=UserRoadmapDetailResponse)
def complete_module(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return complete_module_service(db, current_user.id, id)
