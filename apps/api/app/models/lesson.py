from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class LessonModule(Base):
    __tablename__ = "lesson_modules"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    roadmap_module_id: Mapped[int] = mapped_column(
        ForeignKey("roadmap_modules.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    lesson_order: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    content_json: Mapped[Dict[str, Any]] = mapped_column(
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    roadmap_module = relationship("RoadmapModule")
    submissions = relationship(
        "LessonSubmission",
        back_populates="lesson",
        cascade="all, delete-orphan",
    )


class LessonSubmission(Base):
    __tablename__ = "lesson_submissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    lesson_id: Mapped[int] = mapped_column(
        ForeignKey("lesson_modules.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    code: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[str] = mapped_column(String(50), default="python", nullable=False)
    passed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

    lesson = relationship("LessonModule", back_populates="submissions")
    user = relationship("User")
