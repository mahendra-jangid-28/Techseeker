from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.schemas.admin import AdminAnalyticsResponse
from app.services import admin_service

router = APIRouter(
    tags=["Admin"],
)


@router.get("/admin/analytics", response_model=AdminAnalyticsResponse)
@router.get("/api/v1/admin/analytics", response_model=AdminAnalyticsResponse)
def get_analytics(
    db: Session = Depends(get_db),
) -> AdminAnalyticsResponse:
    """
    Returns high-level aggregate platform analytics (read-only).
    """
    return admin_service.get_admin_analytics(db=db)
