from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.progress import UserProgressResponse
from app.services.progress_service import get_user_progress_overview

router = APIRouter(prefix="/users", tags=["Progress"])


@router.get("/progress", response_model=UserProgressResponse)
def get_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_user_progress_overview(db, current_user)
