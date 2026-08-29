from datetime import datetime
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    language: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="python",
    )

    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        default="",
    )

    category: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        default="Full Stack",
    )

    difficulty: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        default="Intermediate",
    )

    tech_stack: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        default="Python, FastAPI, SQLite",
    )

    github_url: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    live_demo_url: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    thumbnail: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    code: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="",
    )

    files: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        default=dict,
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="draft",  # 'draft', 'submitted', 'completed'
    )

    score: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )

    review_json: Mapped[Optional[dict]] = mapped_column(
        JSON,
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

    user = relationship(
        "User",
        back_populates="projects",
    )
