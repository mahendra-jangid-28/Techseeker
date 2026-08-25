from sqlalchemy import select, and_, desc
from sqlalchemy.orm import Session

from app.models.conversation import Conversation
from app.models.message import Message


class ChatRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_conversation(
        self,
        user_id: int,
        title: str,
    ) -> Conversation:
        conversation = Conversation(
            user_id=user_id,
            title=title,
        )

        self.db.add(conversation)
        self.db.commit()
        self.db.refresh(conversation)

        return conversation

    def get_conversations(
        self,
        user_id: int,
    ) -> list[Conversation]:
        return (
            self.db.execute(
                select(Conversation)
                .where(Conversation.user_id == user_id)
                .order_by(Conversation.updated_at.desc())
            )
            .scalars()
            .all()
        )

    def get_conversation(
        self,
        conversation_id: int,
        user_id: int,
    ) -> Conversation | None:
        return (
            self.db.execute(
                select(Conversation).where(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id,
                )
            )
            .scalar_one_or_none()
        )

    def create_message(
        self,
        conversation_id: int,
        role: str,
        content: str,
        is_current: bool = True,
        parent_message_id: int | None = None,
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            is_current=is_current,
            parent_message_id=parent_message_id,
        )

        self.db.add(message)
        self.db.commit()
        self.db.refresh(message)

        return message

    def get_message(
        self,
        message_id: int,
    ) -> Message | None:
        return (
            self.db.query(Message)
            .filter(Message.id == message_id)
            .first()
        )

    def get_messages(
        self,
        conversation_id: int,
        only_current: bool = True,
    ) -> list[Message]:
        query = self.db.query(Message).filter(Message.conversation_id == conversation_id)
        if only_current:
            query = query.filter(Message.is_current == True)  # noqa: E712
        return query.order_by(Message.created_at.asc(), Message.id.asc()).all()

    def get_messages_up_to(
        self,
        conversation_id: int,
        before_or_at_message_id: int,
    ) -> list[Message]:
        """
        Retrieves active messages in chronological order up to a specific message ID.
        """
        return (
            self.db.query(Message)
            .filter(
                Message.conversation_id == conversation_id,
                Message.is_current == True,  # noqa: E712
                Message.id <= before_or_at_message_id,
            )
            .order_by(Message.created_at.asc(), Message.id.asc())
            .all()
        )

    def get_previous_user_message(
        self,
        conversation_id: int,
        before_message_id: int,
    ) -> Message | None:
        return (
            self.db.query(Message)
            .filter(
                Message.conversation_id == conversation_id,
                Message.role == "user",
                Message.id < before_message_id,
            )
            .order_by(desc(Message.created_at), desc(Message.id))
            .first()
        )

    def mark_message_not_current(
        self,
        message: Message,
    ) -> Message:
        message.is_current = False
        self.db.commit()
        self.db.refresh(message)
        return message

    def update_conversation_title(
        self,
        conversation: Conversation,
        title: str,
    ) -> Conversation:
        conversation.title = title

        self.db.commit()
        self.db.refresh(conversation)

        return conversation