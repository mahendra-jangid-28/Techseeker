from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class WeakTopic(Base):
    __tablename__ = "weak_topics"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    topic: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    failure_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    successful_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.5, nullable=False)
    last_failed_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    last_success_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="tracking",
        index=True,
        nullable=False,
    )  # 'tracking' (1 failure), 'active' (>=2 failures), 'improving' (recovering), 'resolved' (mastered)
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
        UniqueConstraint("user_id", "topic", name="uq_user_topic_weakness"),
    )

    user = relationship("User", back_populates="weak_topics")
