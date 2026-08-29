from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.user import User
from app.models.user_memory import UserMemory
from app.models.weak_topic import WeakTopic
from app.models.user_progress import UserProgress
from app.models.user_activity import UserActivity
from app.services.memory_service import (
    upsert_user_memory,
    record_topic_attempt,
    get_active_weak_topics,
    build_personalized_mentor_context,
)
from app.services.progress_service import (
    award_xp,
    update_streak,
    get_activity_heatmap,
    get_user_progress_overview,
)
from app.services.recommendation_service import generate_deterministic_recommendations


def test_ai_mentor_memory_and_context_construction():
    """
    Verifies long-term mentor memory upsert and prompt context construction.
    """
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    user = User(email="mentor_learner@techseeker.dev", full_name="Ada Lovelace", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)

    # 1. Upsert durable memories
    mem1 = upsert_user_memory(
        db,
        user_id=user.id,
        memory_key="learning_goal",
        memory_value="Become a Backend Systems Engineer",
        memory_type="learning_goal",
        importance=3,
    )
    assert mem1.memory_value == "Become a Backend Systems Engineer"

    mem2 = upsert_user_memory(
        db,
        user_id=user.id,
        memory_key="completed_topic:python_variables",
        memory_value="Mastered Python Variables",
        memory_type="completed_topic",
        importance=2,
    )
    assert mem2.memory_key == "completed_topic:python_variables"

    # 2. Build personalized mentor context
    context = build_personalized_mentor_context(db, user.id)
    assert "Learner Profile:" in context
    assert "Mastered Topics:" in context


def test_weak_topic_detection_lifecycle():
    """
    Verifies weak topic state transitions:
    - Attempt 1 failure -> status: 'tracking'
    - Attempt 2 failure -> status: 'active'
    - Attempt 3 success -> status: 'improving'
    - Attempt 4 success -> status: 'resolved'
    """
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    user = User(email="weak_topic_user@techseeker.dev", full_name="Alan Turing", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)

    topic = "Recursion & Call Stacks"

    # Failure 1 -> tracking
    wt1 = record_topic_attempt(db, user.id, topic, passed=False)
    assert wt1.failure_count == 1
    assert wt1.status == "tracking"
    assert len(get_active_weak_topics(db, user.id)) == 0  # Not in active list yet

    # Failure 2 -> active
    wt2 = record_topic_attempt(db, user.id, topic, passed=False)
    assert wt2.failure_count == 2
    assert wt2.status == "active"
    assert len(get_active_weak_topics(db, user.id)) == 1

    # Recovery 1 -> improving
    wt3 = record_topic_attempt(db, user.id, topic, passed=True)
    assert wt3.successful_attempts == 1
    assert wt3.status == "improving"

    # Recovery 2 -> resolved
    wt4 = record_topic_attempt(db, user.id, topic, passed=True)
    assert wt4.successful_attempts == 2
    assert wt4.status == "resolved"
    assert len(get_active_weak_topics(db, user.id)) == 0


def test_xp_rewards_streak_and_heatmap():
    """
    Verifies XP rewards accumulation, streak maintenance, and heatmap matrix.
    """
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    user = User(email="gamified_user@techseeker.dev", full_name="Grace Hopper", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)

    # Award Lesson (+20 XP)
    p1 = award_xp(db, user.id, "lesson_completed", "Lesson 1", 20)
    assert p1.xp == 20
    assert p1.streak == 1

    # Award Challenge (+30 XP)
    p2 = award_xp(db, user.id, "interactive_challenge_passed", "Challenge 1", 30)
    assert p2.xp == 50

    # Award Quiz (+10 XP)
    p3 = award_xp(db, user.id, "quiz_completed", "Quiz 1", 10)
    assert p3.xp == 60

    # Verify Activity Heatmap
    matrix, days = get_activity_heatmap(db, user.id)
    assert len(matrix) == 5
    assert len(days) == 35
    assert any(d.count > 0 for d in days)


def test_adaptive_recommendations_priority():
    """
    Verifies adaptive recommendation priority ordering (Weak topic -> Practice).
    """
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    user = User(email="recs_user@techseeker.dev", full_name="Linus Torvalds", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)

    # Add active weak topic
    record_topic_attempt(db, user.id, "Dynamic Programming", passed=False)
    record_topic_attempt(db, user.id, "Dynamic Programming", passed=False)

    recs = generate_deterministic_recommendations(db, user.id)
    assert len(recs) >= 1
    assert recs[0].recommendation_type == "weak_topic_revision"
    assert recs[0].topic == "Dynamic Programming"
    assert recs[0].priority == 1
