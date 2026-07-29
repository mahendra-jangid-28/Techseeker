from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.chat import (
    ConversationCreate,
    ConversationDetailResponse,
    ConversationResponse,
)
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


@router.get("/conversations", response_model=list[ConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ConversationResponse]:
    conversations = chat_service.get_conversations(
        db=db,
        user=current_user,
    )
    return conversations


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetailResponse,
)
def get_conversation_detail(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationDetailResponse:
    conversation = chat_service.get_conversation_detail(
        db=db,
        user=current_user,
        conversation_id=conversation_id,
    )
    return conversation