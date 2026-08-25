from datetime import datetime, timezone
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.study_recommendation import StudyRecommendation
from app.models.weak_topic import WeakTopic
from app.models.user_memory import UserMemory
from app.models.roadmap import (
    Roadmap,
    RoadmapModule,
    UserRoadmapProgress,
    UserRoadmapSelection,
)


def generate_deterministic_recommendations(db: Session, user_id: int) -> List[StudyRecommendation]:
    """
    Generates study recommendations strictly based on deterministic rules:
    Priority 1: Active weak topics (>= 2 failures)
    Priority 2: Continue active in-progress roadmap module
    Priority 3: Next unlocked/available roadmap module
    Priority 4: Review recent learning topic
    Priority 5: Interactive coding practice in playground
    """
    recs: List[StudyRecommendation] = []
    seen_topics = set()

    # Priority 1: Active weak topics (Only active, not single failure tracking)
    active_weak_topics = (
        db.query(WeakTopic)
        .filter(
            WeakTopic.user_id == user_id,
            WeakTopic.status == "active",
        )
        .order_by(desc(WeakTopic.failure_count), desc(WeakTopic.updated_at))
        .all()
    )

    for weak in active_weak_topics[:2]:
        if weak.topic not in seen_topics:
            seen_topics.add(weak.topic)
            recs.append(
                StudyRecommendation(
                    user_id=user_id,
                    recommendation_type="weak_topic_revision",
                    title=f"Review & Practice: {weak.topic}",
                    description=f"You encountered repeated challenges with {weak.topic}. Review the core concepts and try the interactive challenge again.",
                    topic=weak.topic,
                    priority=1,
                    reason=f"Failed {weak.failure_count} times ({round(weak.confidence * 100)}% confidence)",
                    action_url="/learn",
                    status="pending",
                )
            )

    # Priority 2 & 3: Roadmap progression
    selection = (
        db.query(UserRoadmapSelection)
        .filter(UserRoadmapSelection.user_id == user_id)
        .first()
    )

    if selection:
        roadmap = db.query(Roadmap).filter(Roadmap.id == selection.roadmap_id).first()
        if roadmap:
            # Check for currently unlocked module (in-progress)
            unlocked_progress = (
                db.query(UserRoadmapProgress, RoadmapModule)
                .join(RoadmapModule, UserRoadmapProgress.module_id == RoadmapModule.id)
                .filter(
                    UserRoadmapProgress.user_id == user_id,
                    UserRoadmapProgress.roadmap_id == selection.roadmap_id,
                    UserRoadmapProgress.status == "unlocked",
                )
                .order_by(RoadmapModule.order_index)
                .first()
            )

            if unlocked_progress:
                _, module = unlocked_progress
                if module.title not in seen_topics:
                    seen_topics.add(module.title)
                    recs.append(
                        StudyRecommendation(
                            user_id=user_id,
                            recommendation_type="continue_learning",
                            title=f"Continue: {module.title}",
                            description=f"Pick up where you left off in your {roadmap.title} roadmap.",
                            topic=module.title,
                            priority=2,
                            reason=f"Active module in {roadmap.title}",
                            action_url="/learn",
                            status="pending",
                        )
                    )

            # Check next upcoming module if available
            completed_module_ids = [
                p.module_id
                for p in db.query(UserRoadmapProgress)
                .filter(
                    UserRoadmapProgress.user_id == user_id,
                    UserRoadmapProgress.roadmap_id == selection.roadmap_id,
                    UserRoadmapProgress.status == "completed",
                )
                .all()
            ]

            upcoming_module = (
                db.query(RoadmapModule)
                .filter(
                    RoadmapModule.roadmap_id == selection.roadmap_id,
                    ~RoadmapModule.id.in_(completed_module_ids) if completed_module_ids else True,
                )
                .order_by(RoadmapModule.order_index)
                .first()
            )

            if upcoming_module and upcoming_module.title not in seen_topics:
                seen_topics.add(upcoming_module.title)
                recs.append(
                    StudyRecommendation(
                        user_id=user_id,
                        recommendation_type="next_roadmap_module",
                        title=f"Roadmap Milestone: {upcoming_module.title}",
                        description=f"Next scheduled milestone on your path to becoming an {roadmap.title}.",
                        topic=upcoming_module.title,
                        priority=3,
                        reason=f"Next step in {roadmap.title}",
                        action_url="/roadmap",
                        status="pending",
                    )
                )

    # Priority 4: Recent learning topic review
    recent_memories = (
        db.query(UserMemory)
        .filter(
            UserMemory.user_id == user_id,
            UserMemory.memory_type.in_(["recent_learning_context", "completed_topic"]),
        )
        .order_by(desc(UserMemory.updated_at))
        .limit(3)
        .all()
    )

    for mem in recent_memories:
        topic_name = mem.memory_value.split(":")[-1].strip() if ":" in mem.memory_value else mem.memory_value
        if topic_name and topic_name not in seen_topics and len(recs) < 4:
            seen_topics.add(topic_name)
            recs.append(
                StudyRecommendation(
                    user_id=user_id,
                    recommendation_type="review",
                    title=f"Deepen Skills: {topic_name}",
                    description=f"Solidify what you learned in {topic_name} with further exploration.",
                    topic=topic_name,
                    priority=4,
                    reason="Recent learning activity",
                    action_url="/learn",
                    status="pending",
                )
            )

    # Priority 5: Fallback General Practice
    if len(recs) < 3:
        recs.append(
            StudyRecommendation(
                user_id=user_id,
                recommendation_type="practice",
                title="Interactive Code Sandbox",
                description="Experiment freely with Python code, algorithms, and real-time execution in the playground.",
                topic="Hands-on Coding",
                priority=5,
                reason="Daily deliberate practice",
                action_url="/playground",
                status="pending",
            )
        )

    # Persist in DB
    for r in recs:
        db.add(r)
    db.commit()

    return recs


def get_recommendations(db: Session, user_id: int) -> List[StudyRecommendation]:
    """
    Returns pending recommendations for user, or generates them deterministically if none exist.
    """
    existing = (
        db.query(StudyRecommendation)
        .filter(
            StudyRecommendation.user_id == user_id,
            StudyRecommendation.status == "pending",
        )
        .order_by(StudyRecommendation.priority, desc(StudyRecommendation.created_at))
        .all()
    )

    if existing:
        return existing

    return generate_deterministic_recommendations(db, user_id)


def refresh_recommendations(db: Session, user_id: int) -> List[StudyRecommendation]:
    """
    Clears existing pending recommendations and regenerates fresh ones.
    """
    db.query(StudyRecommendation).filter(
        StudyRecommendation.user_id == user_id,
        StudyRecommendation.status == "pending",
    ).delete(synchronize_session="fetch")
    db.commit()

    return generate_deterministic_recommendations(db, user_id)

