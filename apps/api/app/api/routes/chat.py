from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.chat import (
    ChatResponse,
    ConversationCreate,
    ConversationDetailResponse,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
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


@router.post(
    "/conversations",
    response_model=ConversationResponse,
)
def create_conversation(
    data: ConversationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationResponse:
    return chat_service.create_conversation(
        db=db,
        user=current_user,
        data=data,
    )


@router.get(
    "/conversations",
    response_model=list[ConversationResponse],
)
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ConversationResponse]:
    return chat_service.get_conversations(
        db=db,
        user=current_user,
    )


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetailResponse,
)
def get_conversation_detail(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationDetailResponse:
    return chat_service.get_conversation_detail(
        db=db,
        user=current_user,
        conversation_id=conversation_id,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=ChatResponse,
)
def send_message(
    conversation_id: int,
    data: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    return chat_service.send_message(
        db=db,
        user=current_user,
        conversation_id=conversation_id,
        data=data,
    )


@router.post("/conversations/{conversation_id}/stream")
async def stream_chat(
    conversation_id: int,
    data: MessageCreate,
    current_user: User = Depends(get_current_user),
):
    async def event_generator():
        async for chunk in chat_service.stream_chat(
            conversation_id=conversation_id,
            user_id=current_user.id,
            content=data.content,
        ):
            yield f"data: {chunk}\n\n"
        yield "event: done\ndata: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post(
    "/messages/{assistant_message_id}/regenerate",
    response_model=MessageResponse,
)
def regenerate_response(
    assistant_message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    return chat_service.regenerate_response(
        db=db,
        user=current_user,
        assistant_message_id=assistant_message_id,
    )