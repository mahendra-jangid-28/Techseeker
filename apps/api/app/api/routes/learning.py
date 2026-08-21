from fastapi import APIRouter, Depends

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.learning import (
    LearningRequest,
    LearningResponse,
)
from app.services.learning_service import (
    generate_learning_content,
)


router = APIRouter(
    prefix="/learning",
    tags=["Learning"],
)


@router.post(
    "/generate",
    response_model=LearningResponse,
)
def generate_learning(
    data: LearningRequest,
    current_user: User = Depends(get_current_user),
) -> LearningResponse:
    return generate_learning_content(
        data
    )
