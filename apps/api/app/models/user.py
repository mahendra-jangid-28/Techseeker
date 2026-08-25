from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    conversations = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    projects = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    progress = relationship(
        "UserProgress",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )
    activities = relationship(
        "UserActivity",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(UserActivity.created_at)",
    )
    memories = relationship(
        "UserMemory",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    weak_topics = relationship(
        "WeakTopic",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    recommendations = relationship(
        "StudyRecommendation",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="StudyRecommendation.priority",
    )