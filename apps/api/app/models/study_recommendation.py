from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class StudyRecommendation(Base):
    __tablename__ = "study_recommendations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    recommendation_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )  # 'weak_topic_revision', 'continue_learning', 'next_roadmap_module', 'practice', 'review'
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    topic: Mapped[str] = mapped_column(String(255), nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # 1 (highest) to 5
    reason: Mapped[str] = mapped_column(String(255), nullable=False)
    action_url: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
    )  # 'pending', 'completed', 'dismissed'
    recommended_for: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    user = relationship("User", back_populates="recommendations")
