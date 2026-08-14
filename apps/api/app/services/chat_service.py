from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.user import User
from app.providers.gemini_provider import GeminiProvider
from app.repositories.chat_repository import ChatRepository
from app.schemas.chat import ConversationCreate, MessageCreate
from app.services.title_service import generate_title
from app.services.context_service import build_context

def generate_ai_response(
    messages: list[dict[str, str]],
) -> str:
    try:
        provider = GeminiProvider()
        return provider.generate(messages)
    except Exception as e:
        print(f"Gemini Error: {e}")
        return "Sorry, I couldn't generate a response at the moment."


def create_conversation(
    db: Session,
    user: User,
    data: ConversationCreate,
) -> Conversation:
    repository = ChatRepository(db)

    conversation = repository.create_conversation(
        user_id=user.id,
        title=data.title or "New Chat",
    )

    return conversation


def get_conversations(
    db: Session,
    user: User,
) -> list[Conversation]:
    repository = ChatRepository(db)

    return repository.get_conversations(
        user_id=user.id,
    )


def get_conversation_detail(
    db: Session,
    user: User,
    conversation_id: int,
) -> Conversation:
    repository = ChatRepository(db)

    conversation = repository.get_conversation(
        conversation_id=conversation_id,
        user_id=user.id,
    )

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    return conversation


def send_message(
    db: Session,
    user: User,
    conversation_id: int,
    data: MessageCreate,
):
    repository = ChatRepository(db)

    conversation = repository.get_conversation(
        conversation_id=conversation_id,
        user_id=user.id,
    )

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    user_message = repository.create_message(
        conversation_id=conversation.id,
        role="user",
        content=data.content,
    )

    messages = repository.get_messages(conversation.id)

    if len(messages) == 1 and conversation.title == "New Chat":
        print("===== TITLE DEBUG =====")
        print(f"Messages Count: {len(messages)}")
        print(f"Current Title: {conversation.title}")

        title = generate_title(data.content)

        print(f"Generated Title: {title}")

        repository.update_conversation_title(
            conversation=conversation,
            title=title,
        )

        print("Title Updated Successfully")

    gemini_messages = build_context(messages)

    ai_text = generate_ai_response(gemini_messages)

    assistant_message = repository.create_message(
        conversation_id=conversation.id,
        role="assistant",
        content=ai_text,
    )

    return {
        "user_message": user_message,
        "assistant_message": assistant_message,
    }