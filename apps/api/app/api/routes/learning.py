from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.learning import (
    LearningRequest,
    LearningResponse,
)
from app.services.learning_service import (
    generate_learning_content,
)
from app.services.memory_service import (
    upsert_user_memory,
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
    db: Session = Depends(get_db),
) -> LearningResponse:
    res = generate_learning_content(data)

    # Record recent learning context in user_memory
    upsert_user_memory(
        db,
        user_id=current_user.id,
        memory_key="recent_learning_context",
        memory_value=f"Explored {data.topic} ({data.level} in {data.language})",
        memory_type="recent_learning_context",
        importance=1,
    )

    return res

