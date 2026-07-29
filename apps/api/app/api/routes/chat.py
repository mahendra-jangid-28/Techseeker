from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.chat import ConversationCreate, ConversationResponse
from app.services import chat_service

router = APIRouter(
    prefix="/chat",
    tags=["Chat"],
)


@router.get("/test")
def test_chat():
    return {
        "message": "Chat route working"
    }


@router.post("/conversations", response_model=ConversationResponse)
def create_conversation(
    data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationResponse:
    conversation = chat_service.create_conversation(
        db=db,
        user=current_user,
        data=data,
    )
    return conversation