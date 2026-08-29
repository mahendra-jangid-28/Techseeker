from datetime import datetime
from typing import Any, Dict
from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class AICache(Base):
    __tablename__ = "ai_cache"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    cache_key: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )
    topic: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    language: Mapped[str] = mapped_column(String(50), default="English", nullable=False)
    level: Mapped[str] = mapped_column(String(50), default="beginner", nullable=False)
    response_json: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )
