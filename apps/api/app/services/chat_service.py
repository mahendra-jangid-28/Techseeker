import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.user import User
from app.providers.gemini_provider import GeminiProvider
from app.repositories.chat_repository import ChatRepository
from app.schemas.chat import ConversationCreate, MessageCreate
from app.services.title_service import generate_title
from app.services.context_service import build_context
from app.services.system_prompt_service import get_system_prompt
from app.services.memory_service import build_personalized_mentor_context

logger = logging.getLogger("techseeker.chat")


def generate_ai_response(
    messages: list[dict[str, str]],
    system_instruction: str | None = None,
) -> str:
    try:
        provider = GeminiProvider()
        return provider.generate(messages, system_instruction=system_instruction)
    except Exception as e:
        logger.error(f"Gemini Error: {e}")
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

    current_messages = repository.get_messages(
        conversation_id=conversation.id,
        only_current=True,
    )

    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at,
        "messages": current_messages,
    }


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
        logger.debug(f"Generating conversation title for conversation_id={conversation.id}")

        title = generate_title(data.content)

        repository.update_conversation_title(
            conversation=conversation,
            title=title,
        )

        logger.debug(f"Conversation title updated for conversation_id={conversation.id}")

    gemini_messages = build_context(messages)

    adaptive_context = build_personalized_mentor_context(db, user.id)
    system_instruction = get_system_prompt(adaptive_context)

    ai_text = generate_ai_response(gemini_messages, system_instruction=system_instruction)

    assistant_message = repository.create_message(
        conversation_id=conversation.id,
        role="assistant",
        content=ai_text,
    )

    return {
        "user_message": user_message,
        "assistant_message": assistant_message,
    }


def regenerate_response(
    db: Session,
    user: User,
    assistant_message_id: int,
) -> Message:
    """
    Regenerates an assistant response in a conversation:
    1. Validates ownership.
    2. Finds the assistant message.
    3. Finds the preceding user message.
    4. Marks the old assistant message as is_current = False.
    5. Builds the context up to the previous user message.
    6. Generates a fresh AI response.
    7. Saves the new message with is_current = True and parent_message_id pointing to the old message.
    """
    repository = ChatRepository(db)

    old_assistant_message = repository.get_message(assistant_message_id)
    if old_assistant_message is None or old_assistant_message.role != "assistant":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assistant message not found",
        )

    conversation = repository.get_conversation(
        conversation_id=old_assistant_message.conversation_id,
        user_id=user.id,
    )
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    previous_user_message = repository.get_previous_user_message(
        conversation_id=conversation.id,
        before_message_id=old_assistant_message.id,
    )
    if previous_user_message is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No preceding user message found to regenerate from",
        )

    # Mark old assistant message as inactive
    repository.mark_message_not_current(old_assistant_message)

    # Build context up to that previous user message
    active_messages = repository.get_messages_up_to(
        conversation_id=conversation.id,
        before_or_at_message_id=previous_user_message.id,
    )

    gemini_messages = build_context(active_messages)
    adaptive_context = build_personalized_mentor_context(db, user.id)
    system_instruction = get_system_prompt(adaptive_context)

    ai_text = generate_ai_response(gemini_messages, system_instruction=system_instruction)

    new_assistant_message = repository.create_message(
        conversation_id=conversation.id,
        role="assistant",
        content=ai_text,
        is_current=True,
        parent_message_id=old_assistant_message.id,
    )

    return new_assistant_message


async def stream_chat(
    conversation_id: int,
    user_id: int,
    content: str,
    db: Session | None = None,
):
    """
    Streams AI response chunks via Server-Sent Events (SSE).
    1. Validates conversation ownership.
    2. Saves user message.
    3. Builds conversation and adaptive mentor context.
    4. Streams response chunks immediately.
    5. Persists full assistant message upon completion.
    """
    session = db if db is not None else SessionLocal()
    should_close = db is None

    try:
        repository = ChatRepository(session)

        conversation = repository.get_conversation(
            conversation_id=conversation_id,
            user_id=user_id,
        )

        if conversation is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )

        repository.create_message(
            conversation_id=conversation.id,
            role="user",
            content=content,
        )

        messages = repository.get_messages(conversation.id)

        if len(messages) == 1 and conversation.title == "New Chat":
            title = generate_title(content)
            repository.update_conversation_title(
                conversation=conversation,
                title=title,
            )

        gemini_messages = build_context(messages)

        adaptive_context = build_personalized_mentor_context(session, user_id)
        system_instruction = get_system_prompt(adaptive_context)

        provider = GeminiProvider()
        full_text_chunks = []

        for chunk in provider.stream_generate(gemini_messages, system_instruction=system_instruction):
            full_text_chunks.append(chunk)
            yield chunk

        full_response = "".join(full_text_chunks).strip()

        repository.create_message(
            conversation_id=conversation.id,
            role="assistant",
            content=full_response,
        )
    except Exception:
        if should_close:
            session.rollback()
        raise
    finally:
        if should_close:
            session.close()