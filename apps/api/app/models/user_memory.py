from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class UserMemory(Base):
    __tablename__ = "user_memory"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    memory_key: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    memory_value: Mapped[str] = mapped_column(Text, nullable=False)
    memory_type: Mapped[str] = mapped_column(
        String(50),
        index=True,
        nullable=False,
    )  # e.g., 'learning_preference', 'completed_topic', 'current_goal', 'preferred_explanation_style', 'recent_learning_context', 'important_learning_fact'
    importance: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("user_id", "memory_key", name="uq_user_memory_key"),
    )

    user = relationship("User", back_populates="memories")
