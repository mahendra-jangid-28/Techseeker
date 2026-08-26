import re
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user_memory import UserMemory
from app.models.weak_topic import WeakTopic
from app.models.roadmap import (
    Roadmap,
    RoadmapModule,
    UserRoadmapProgress,
    UserRoadmapSelection,
)


def normalize_topic_key(topic: str) -> str:
    """
    Normalizes a topic title into a clean alphanumeric key.
    E.g. 'Mastering Python Variables' -> 'python_variables'
    """
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", "", topic.lower()).strip()
    words = [w for w in cleaned.split() if w not in {"mastering", "intro", "to", "the", "and", "in"}]
    return "_".join(words) if words else cleaned.replace(" ", "_")


def upsert_user_memory(
    db: Session,
    user_id: int,
    memory_key: str,
    memory_value: str,
    memory_type: str,
    importance: int = 1,
) -> UserMemory:
    """
    Idempotently stores or updates a durable fact in user_memory.
    """
    existing = (
        db.query(UserMemory)
        .filter(
            UserMemory.user_id == user_id,
            UserMemory.memory_key == memory_key,
        )
        .first()
    )

    if existing:
        existing.memory_value = memory_value
        existing.memory_type = memory_type
        existing.importance = importance
        existing.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return existing

    new_memory = UserMemory(
        user_id=user_id,
        memory_key=memory_key,
        memory_value=memory_value,
        memory_type=memory_type,
        importance=importance,
    )
    db.add(new_memory)
    db.commit()
    db.refresh(new_memory)
    return new_memory


def get_user_memories(db: Session, user_id: int) -> List[UserMemory]:
    """
    Returns all durable learning memories for a user.
    """
    return (
        db.query(UserMemory)
        .filter(UserMemory.user_id == user_id)
        .order_by(desc(UserMemory.importance), desc(UserMemory.updated_at))
        .all()
    )


def record_topic_attempt(
    db: Session,
    user_id: int,
    topic: str,
    passed: bool,
) -> WeakTopic:
    """
    Deterministic weak topic detection engine:
    1. First failure: tracked internally with status='tracking' (not recommended as active weakness yet).
    2. Two or more failures: status becomes 'active'.
    3. Successful attempt after weakness: status becomes 'improving'.
    4. Sufficient recovery: status becomes 'resolved'.
    5. Confidence accurately reflects recovery based on total and successful attempts.
    """
    weak_topic = (
        db.query(WeakTopic)
        .filter(
            WeakTopic.user_id == user_id,
            WeakTopic.topic == topic,
        )
        .first()
    )

    now = datetime.now(timezone.utc)

    if not weak_topic:
        weak_topic = WeakTopic(
            user_id=user_id,
            topic=topic,
            failure_count=0,
            successful_attempts=0,
            attempt_count=0,
            confidence=0.5,
            status="tracking" if not passed else "resolved",
        )
        db.add(weak_topic)

    weak_topic.attempt_count += 1
    weak_topic.updated_at = now

    if passed:
        weak_topic.successful_attempts += 1
        weak_topic.last_success_at = now

        if weak_topic.status == "active":
            weak_topic.status = "improving"
        elif weak_topic.status == "improving":
            # Recovered if successful attempts match or exceed failures
            if weak_topic.successful_attempts >= weak_topic.failure_count:
                weak_topic.status = "resolved"
        elif weak_topic.status == "tracking":
            if weak_topic.failure_count == 0 or weak_topic.successful_attempts >= weak_topic.failure_count:
                weak_topic.status = "resolved"

        # Confidence calculation: recovers deterministically without permanent penalty
        if weak_topic.status == "resolved":
            weak_topic.confidence = 1.0
        else:
            raw_ratio = weak_topic.successful_attempts / max(1, weak_topic.attempt_count)
            weak_topic.confidence = min(0.95, round(raw_ratio + 0.25, 2))

    else:
        weak_topic.failure_count += 1
        weak_topic.last_failed_at = now

        if weak_topic.failure_count >= 2:
            weak_topic.status = "active"
        else:
            # First failure is kept under internal tracking
            weak_topic.status = "tracking"

        raw_ratio = weak_topic.successful_attempts / max(1, weak_topic.attempt_count)
        weak_topic.confidence = max(0.0, round(raw_ratio, 2))

    db.commit()
    db.refresh(weak_topic)
    return weak_topic


def get_active_weak_topics(db: Session, user_id: int) -> List[WeakTopic]:
    """
    Returns active or improving weak topics for a user.
    """
    return (
        db.query(WeakTopic)
        .filter(
            WeakTopic.user_id == user_id,
            WeakTopic.status.in_(["active", "improving"]),
        )
        .order_by(desc(WeakTopic.failure_count), desc(WeakTopic.updated_at))
        .all()
    )


def build_personalized_mentor_context(db: Session, user_id: int) -> str:
    """
    Constructs a concise, bounded personalized learning context for the AI Mentor
    powered by the unified Learner Intelligence Snapshot.
    """
    from app.services.learner_intelligence_service import get_learner_snapshot, format_mentor_learner_context

    snapshot = get_learner_snapshot(db, user_id)
    return format_mentor_learner_context(snapshot)
