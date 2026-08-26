from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user_progress import UserProgress
from app.models.weak_topic import WeakTopic
from app.models.user_memory import UserMemory
from app.models.user_activity import UserActivity
from app.models.roadmap import (
    Roadmap,
    RoadmapModule,
    UserRoadmapProgress,
    UserRoadmapSelection,
)
from app.schemas.intelligence import (
    WeakTopicSnapshot,
    LearnerSnapshot,
    NextBestAction,
    LearnerRecommendationsResponse,
)
from app.services.progress_service import calculate_level, MEANINGFUL_ACTIVITY_TYPES


def get_learner_snapshot(db: Session, user_id: int) -> LearnerSnapshot:
    """
    Constructs a unified, real-time snapshot of the learner's brain across all subsystems.
    Reads only from existing database models with zero duplication.
    """
    # 1. Progress Metrics (XP, Level, Streak)
    progress = db.query(UserProgress).filter(UserProgress.user_id == user_id).first()
    xp = progress.xp if progress else 0
    streak = progress.streak if progress else 0
    level = calculate_level(xp)

    # 2. Active Roadmap & Completion Percentage
    selection = (
        db.query(UserRoadmapSelection)
        .filter(UserRoadmapSelection.user_id == user_id)
        .first()
    )
    active_roadmap: Optional[str] = None
    active_roadmap_id: Optional[int] = None
    roadmap_completion_pct = 0

    if selection:
        roadmap = db.query(Roadmap).filter(Roadmap.id == selection.roadmap_id).first()
        if roadmap:
            active_roadmap = roadmap.title
            active_roadmap_id = roadmap.id

            total_modules = (
                db.query(RoadmapModule)
                .filter(RoadmapModule.roadmap_id == selection.roadmap_id)
                .count()
            )
            if total_modules > 0:
                completed_count = (
                    db.query(UserRoadmapProgress)
                    .filter(
                        UserRoadmapProgress.user_id == user_id,
                        UserRoadmapProgress.roadmap_id == selection.roadmap_id,
                        UserRoadmapProgress.status == "completed",
                    )
                    .count()
                )
                roadmap_completion_pct = round((completed_count / total_modules) * 100)

    # 3. Mastered / Completed Topics
    completed_memories = (
        db.query(UserMemory)
        .filter(
            UserMemory.user_id == user_id,
            UserMemory.memory_type == "completed_topic",
        )
        .order_by(desc(UserMemory.updated_at))
        .all()
    )
    completed_topics = [m.memory_value for m in completed_memories]

    # Also include completed roadmap modules
    completed_module_rows = (
        db.query(RoadmapModule.title)
        .join(UserRoadmapProgress, UserRoadmapProgress.module_id == RoadmapModule.id)
        .filter(
            UserRoadmapProgress.user_id == user_id,
            UserRoadmapProgress.status == "completed",
        )
        .all()
    )
    for row in completed_module_rows:
        if row[0] not in completed_topics:
            completed_topics.append(row[0])

    # 4. Weak, Improving, and Resolved Topics
    all_weak_records = (
        db.query(WeakTopic)
        .filter(WeakTopic.user_id == user_id)
        .order_by(desc(WeakTopic.failure_count), desc(WeakTopic.updated_at))
        .all()
    )

    active_weak_topics: List[WeakTopicSnapshot] = []
    improving_topics: List[str] = []
    resolved_topics: List[str] = []

    for w in all_weak_records:
        if w.status == "active":
            active_weak_topics.append(
                WeakTopicSnapshot(
                    topic=w.topic,
                    failure_count=w.failure_count,
                    confidence=w.confidence,
                    status=w.status,
                )
            )
        elif w.status == "improving":
            improving_topics.append(w.topic)
        elif w.status == "resolved":
            resolved_topics.append(w.topic)

    # 5. Recent Learning Context
    recent_memory = (
        db.query(UserMemory)
        .filter(
            UserMemory.user_id == user_id,
            UserMemory.memory_type == "recent_learning_context",
        )
        .order_by(desc(UserMemory.updated_at))
        .first()
    )
    recent_learning_context = recent_memory.memory_value if recent_memory else None

    # 6. Learning Velocity (Last 7 Days Meaningful Activities)
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    learning_velocity = (
        db.query(UserActivity)
        .filter(
            UserActivity.user_id == user_id,
            UserActivity.activity_type.in_(MEANINGFUL_ACTIVITY_TYPES),
            UserActivity.created_at >= seven_days_ago,
        )
        .count()
    )

    return LearnerSnapshot(
        user_id=user_id,
        level=level,
        xp=xp,
        streak=streak,
        active_roadmap=active_roadmap,
        active_roadmap_id=active_roadmap_id,
        roadmap_completion_percentage=roadmap_completion_pct,
        completed_topics=completed_topics,
        active_weak_topics=active_weak_topics,
        improving_topics=improving_topics,
        resolved_topics=resolved_topics,
        recent_learning_context=recent_learning_context,
        learning_velocity=learning_velocity,
    )


def generate_next_best_action(
    snapshot: LearnerSnapshot,
    db: Optional[Session] = None,
) -> NextBestAction:
    """
    Priority Rules Engine:
    1. Critical weak topic review (Highest failure count in active weaknesses)
    2. Continue unfinished roadmap module (Active in-progress milestone)
    3. Resume incomplete lesson / recent learning context
    4. Revision after repeated mistakes (Improving topics)
    5. New lesson recommendation / Explore tracks
    """
    # Priority 1: Critical weak topic review
    if snapshot.active_weak_topics:
        # Pick weak topic with most failures or lowest confidence
        primary_weak = sorted(
            snapshot.active_weak_topics,
            key=lambda w: (-w.failure_count, w.confidence),
        )[0]
        return NextBestAction(
            type="weak_topic_review",
            title=f"Revise {primary_weak.topic}",
            reason=f"{primary_weak.failure_count} failed attempts in the last week ({round(primary_weak.confidence * 100)}% confidence)",
            estimated_minutes=18,
            action_url="/learn",
            topic=primary_weak.topic,
        )

    # Priority 2: Continue unfinished roadmap module
    if snapshot.active_roadmap_id and db is not None:
        unlocked_row = (
            db.query(UserRoadmapProgress, RoadmapModule)
            .join(RoadmapModule, UserRoadmapProgress.module_id == RoadmapModule.id)
            .filter(
                UserRoadmapProgress.user_id == snapshot.user_id,
                UserRoadmapProgress.roadmap_id == snapshot.active_roadmap_id,
                UserRoadmapProgress.status == "unlocked",
            )
            .order_by(RoadmapModule.order_index)
            .first()
        )
        if unlocked_row:
            _, module = unlocked_row
            return NextBestAction(
                type="continue_roadmap",
                title=f"Continue: {module.title}",
                reason=f"Active module in your {snapshot.active_roadmap} roadmap",
                estimated_minutes=25,
                action_url="/learn",
                topic=module.title,
            )

    # Priority 3: Resume incomplete lesson / recent learning context
    if snapshot.recent_learning_context:
        topic_name = (
            snapshot.recent_learning_context.split(":")[-1].strip()
            if ":" in snapshot.recent_learning_context
            else snapshot.recent_learning_context
        )
        return NextBestAction(
            type="resume_lesson",
            title=f"Resume: {topic_name}",
            reason="Pick up where you recently practiced",
            estimated_minutes=15,
            action_url="/learn",
            topic=topic_name,
        )

    # Priority 4: Revision after repeated mistakes / improving topics
    if snapshot.improving_topics:
        improving_topic = snapshot.improving_topics[0]
        return NextBestAction(
            type="improving_revision",
            title=f"Solidify: {improving_topic}",
            reason="Reinforce your recent understanding with a quick retest",
            estimated_minutes=12,
            action_url="/learn",
            topic=improving_topic,
        )

    # Priority 5: Default exploration / new lesson
    if snapshot.active_roadmap:
        return NextBestAction(
            type="new_lesson",
            title=f"Explore Next Milestone in {snapshot.active_roadmap}",
            reason="Ready to advance in your career path",
            estimated_minutes=20,
            action_url="/roadmap",
            topic=snapshot.active_roadmap,
        )

    return NextBestAction(
        type="new_lesson",
        title="Select Your Career Roadmap",
        reason="Choose a guided learning path tailored to your goals",
        estimated_minutes=10,
        action_url="/roadmap",
        topic="Getting Started",
    )


def get_full_recommendations(
    db: Session,
    user_id: int,
) -> LearnerRecommendationsResponse:
    """
    Generates unified recommendations consumed by Dashboard, Mentor, and Progress.
    """
    snapshot = get_learner_snapshot(db, user_id)
    next_action = generate_next_best_action(snapshot, db=db)

    secondary: List[NextBestAction] = []
    seen_topics = {next_action.topic}

    # Secondary recommendation 1: Other weak topics
    for weak in snapshot.active_weak_topics:
        if weak.topic not in seen_topics and len(secondary) < 3:
            seen_topics.add(weak.topic)
            secondary.append(
                NextBestAction(
                    type="weak_topic_review",
                    title=f"Practice: {weak.topic}",
                    reason=f"Encountered challenges ({weak.failure_count} retries)",
                    estimated_minutes=15,
                    action_url="/learn",
                    topic=weak.topic,
                )
            )

    # Secondary recommendation 2: Improving topics
    for imp in snapshot.improving_topics:
        if imp not in seen_topics and len(secondary) < 3:
            seen_topics.add(imp)
            secondary.append(
                NextBestAction(
                    type="improving_revision",
                    title=f"Review: {imp}",
                    reason="Recent progress noted - keep momentum",
                    estimated_minutes=12,
                    action_url="/learn",
                    topic=imp,
                )
            )

    # Secondary recommendation 3: Playground deliberate practice
    if len(secondary) < 3:
        secondary.append(
            NextBestAction(
                type="playground_practice",
                title="Hands-on Code Playground",
                reason="Experiment freely with Python sandbox execution",
                estimated_minutes=15,
                action_url="/playground",
                topic="Sandbox Coding",
            )
        )

    weak_topics_to_review = [w.topic for w in snapshot.active_weak_topics]

    continue_learning_dict = None
    if snapshot.recent_learning_context:
        continue_learning_dict = {
            "topic": snapshot.recent_learning_context,
            "progress": 65,
        }

    return LearnerRecommendationsResponse(
        next_best_action=next_action,
        secondary_recommendations=secondary,
        weak_topics_to_review=weak_topics_to_review,
        continue_learning=continue_learning_dict,
    )


def format_mentor_learner_context(snapshot: LearnerSnapshot) -> str:
    """
    Formats the complete LearnerSnapshot into concise, actionable instructions for AI Mentor system prompt.
    """
    lines = []

    # Level & Velocity
    lines.append(f"Learner Profile: Level {snapshot.level} ({snapshot.xp} XP), Streak: {snapshot.streak} days, Velocity: {snapshot.learning_velocity} actions/week")

    # Roadmap
    if snapshot.active_roadmap:
        lines.append(f"Current Career Goal: {snapshot.active_roadmap} ({snapshot.roadmap_completion_percentage}% completed)")

    # Completed Topics
    if snapshot.completed_topics:
        lines.append(f"Mastered Topics: {', '.join(snapshot.completed_topics[:5])}")

    # Active Weak Topics (Critical for Adaptive Tutoring)
    if snapshot.active_weak_topics:
        weak_summaries = [f"{w.topic} ({w.failure_count} mistakes)" for w in snapshot.active_weak_topics]
        lines.append(
            f"Active Weak Topics (CRITICAL: break down concepts step-by-step with analogies and simple examples): {', '.join(weak_summaries)}"
        )

    # Improving Topics
    if snapshot.improving_topics:
        lines.append(f"Recently Improving: {', '.join(snapshot.improving_topics)}")

    # Recent Activity
    if snapshot.recent_learning_context:
        lines.append(f"Recent Learning Activity: {snapshot.recent_learning_context}")

    return "\n".join(lines)
