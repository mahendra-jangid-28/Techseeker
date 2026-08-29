from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.learning import (
    LearningRequest,
    LearningResponse,
    TopicSearchResponse,
)
from app.services.learning_service import (
    generate_learning_content,
    search_topics,
)
from app.services.memory_service import (
    upsert_user_memory,
)


router = APIRouter(
    prefix="/learning",
    tags=["Learning"],
)


@router.get(
    "/search",
    response_model=TopicSearchResponse,
)
def search_knowledge_topics(
    q: str = Query(default="", description="Search query for topics"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TopicSearchResponse:
    """
    Search topics across curated catalog, roadmap modules, and cached topics.
    """
    return search_topics(query=q, db=db)


@router.post(
    "/generate",
    response_model=LearningResponse,
)
def generate_learning(
    data: LearningRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LearningResponse:
    """
    Generate or fetch a 14-part structured learning curriculum for the specified topic, level, and language.
    Utilizes AI Cache to return instant results for previously generated topics.
    """
    res = generate_learning_content(data, db=db)

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
