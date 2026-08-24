from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class UserActivity(Base):
    __tablename__ = "user_activity"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    activity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    activity_title: Mapped[str] = mapped_column(String(255), nullable=False)
    xp_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )

    user = relationship(
        "User",
        back_populates="activities",
    )
