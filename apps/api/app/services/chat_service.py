from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.user import User
from app.repositories.chat_repository import ChatRepository
from app.schemas.chat import ConversationCreate


def generate_ai_response(message: str) -> str:
    return f"AI Response: {message}"


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