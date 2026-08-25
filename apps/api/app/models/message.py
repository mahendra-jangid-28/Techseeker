from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(primary_key=True)

    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
    )

    role: Mapped[str] = mapped_column(
        String(20),
    )

    content: Mapped[str] = mapped_column(
        Text,
    )

    is_current: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    parent_message_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    conversation = relationship(
        "Conversation",
        back_populates="messages",
    )