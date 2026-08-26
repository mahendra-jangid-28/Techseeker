import math
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user import User
from app.models.user_progress import UserProgress
from app.models.user_activity import UserActivity
from app.models.user_memory import UserMemory
from app.models.weak_topic import WeakTopic
from app.models.conversation import Conversation
from app.models.project import Project
from app.models.roadmap import (
    Roadmap,
    RoadmapModule,
    UserRoadmapProgress,
    UserRoadmapSelection,
)
from app.schemas.progress import (
    ContinueLearningItem,
    DailyActivity,
    HeatmapDay,
    RecentActivityItem,
    UserProgressResponse,
)

MEANINGFUL_ACTIVITY_TYPES = [
    "lesson_completed",
    "quiz_completed",
    "interactive_challenge_passed",
    "roadmap_module_completed",
    "learned_topic",
    "project_saved",
]


def calculate_level(xp: int) -> int:
    return math.floor(max(0, xp) / 100) + 1


def get_or_create_progress(db: Session, user_id: int) -> UserProgress:
    progress = db.query(UserProgress).filter(UserProgress.user_id == user_id).first()
    if not progress:
        progress = UserProgress(
            user_id=user_id,
            xp=0,
            streak=0,
            last_active=None,
        )
        db.add(progress)
        db.commit()
        db.refresh(progress)
    return progress


def update_streak(progress: UserProgress, now: Optional[datetime] = None) -> int:
    current_time = now or datetime.now(timezone.utc)
    current_date = current_time.date()

    if progress.last_active is None:
        progress.streak = 1
    else:
        last_date = progress.last_active.date()
        diff_days = (current_date - last_date).days

        if diff_days == 0:
            # Same day: maintain streak
            pass
        elif diff_days == 1:
            # Consecutive day: increment streak
            progress.streak += 1
        elif diff_days > 1:
            # Missed day: reset streak to 1
            progress.streak = 1

    progress.last_active = current_time
    return progress.streak


def award_xp(
    db: Session,
    user_id: int,
    activity_type: str,
    activity_title: str,
    xp_amount: int,
) -> UserProgress:
    progress = get_or_create_progress(db, user_id)
    update_streak(progress)
    progress.xp += max(0, xp_amount)

    activity = UserActivity(
        user_id=user_id,
        activity_type=activity_type,
        activity_title=activity_title,
        xp_earned=xp_amount,
    )
    db.add(activity)
    db.commit()
    db.refresh(progress)
    return progress


def get_continue_learning(db: Session, user_id: int) -> Optional[ContinueLearningItem]:
    # Priority 1: Current active roadmap module
    selection = (
        db.query(UserRoadmapSelection)
        .filter(UserRoadmapSelection.user_id == user_id)
        .first()
    )
    if selection:
        unlocked_row = (
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
        if unlocked_row:
            _, module = unlocked_row
            roadmap = db.query(Roadmap).filter(Roadmap.id == selection.roadmap_id).first()
            topic_name = f"{roadmap.title}: {module.title}" if roadmap else module.title
            return ContinueLearningItem(
                topic=topic_name,
                progress=65,
            )

    # Priority 2: Latest learning or quiz activity
    latest_learning = (
        db.query(UserActivity)
        .filter(
            UserActivity.user_id == user_id,
            UserActivity.activity_type.in_(["learned_topic", "quiz_completed", "roadmap_module_completed"]),
        )
        .order_by(desc(UserActivity.created_at))
        .first()
    )
    if latest_learning:
        progress_val = 80 if latest_learning.activity_type == "quiz_completed" else 55
        return ContinueLearningItem(
            topic=latest_learning.activity_title,
            progress=progress_val,
        )

    # Priority 3: Latest mentor conversation
    latest_conversation = (
        db.query(Conversation)
        .filter(Conversation.user_id == user_id)
        .order_by(desc(Conversation.updated_at))
        .first()
    )
    if latest_conversation and latest_conversation.title:
        return ContinueLearningItem(
            topic=latest_conversation.title,
            progress=40,
        )

    # Priority 4: Latest project
    latest_project = (
        db.query(Project)
        .filter(Project.user_id == user_id)
        .order_by(desc(Project.updated_at))
        .first()
    )
    if latest_project and latest_project.name:
        return ContinueLearningItem(
            topic=f"Project: {latest_project.name}",
            progress=50,
        )

    return None


def get_real_learning_metrics(db: Session, user_id: int) -> dict:
    """
    Computes all verified metrics directly from database records without hardcoded values.
    """
    # 1. Lessons & Modules completed
    completed_modules_count = (
        db.query(UserRoadmapProgress)
        .filter(
            UserRoadmapProgress.user_id == user_id,
            UserRoadmapProgress.status == "completed",
        )
        .count()
    )
    completed_topics_count = (
        db.query(UserMemory)
        .filter(
            UserMemory.user_id == user_id,
            UserMemory.memory_type == "completed_topic",
        )
        .count()
    )
    lessons_completed = max(completed_modules_count, completed_topics_count)

    # 2. Roadmap progress percentage
    selection = (
        db.query(UserRoadmapSelection)
        .filter(UserRoadmapSelection.user_id == user_id)
        .first()
    )
    roadmap_progress_percentage = 0
    if selection:
        total_modules = (
            db.query(RoadmapModule)
            .filter(RoadmapModule.roadmap_id == selection.roadmap_id)
            .count()
        )
        if total_modules > 0:
            completed_in_roadmap = (
                db.query(UserRoadmapProgress)
                .filter(
                    UserRoadmapProgress.user_id == user_id,
                    UserRoadmapProgress.roadmap_id == selection.roadmap_id,
                    UserRoadmapProgress.status == "completed",
                )
                .count()
            )
            roadmap_progress_percentage = round((completed_in_roadmap / total_modules) * 100)

    # 3. Quizzes completed
    quizzes_completed = (
        db.query(UserActivity)
        .filter(
            UserActivity.user_id == user_id,
            UserActivity.activity_type == "quiz_completed",
        )
        .count()
    )

    # 4. Challenges passed
    challenges_passed = (
        db.query(UserActivity)
        .filter(
            UserActivity.user_id == user_id,
            UserActivity.activity_type == "interactive_challenge_passed",
        )
        .count()
    )

    # 5. Weak and resolved topics
    active_weak_topics_count = (
        db.query(WeakTopic)
        .filter(
            WeakTopic.user_id == user_id,
            WeakTopic.status == "active",
        )
        .count()
    )
    resolved_topics_count = (
        db.query(WeakTopic)
        .filter(
            WeakTopic.user_id == user_id,
            WeakTopic.status == "resolved",
        )
        .count()
    )

    return {
        "lessons_completed": lessons_completed,
        "roadmap_progress_percentage": roadmap_progress_percentage,
        "quizzes_completed": quizzes_completed,
        "challenges_passed": challenges_passed,
        "active_weak_topics_count": active_weak_topics_count,
        "resolved_topics_count": resolved_topics_count,
    }


def get_weekly_activity(db: Session, user_id: int) -> List[DailyActivity]:
    now = datetime.now(timezone.utc)
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    # 7 days leading up to today
    weekly: List[DailyActivity] = []
    
    for i in range(6, -1, -1):
        target_date = (now - timedelta(days=i)).date()
        day_str = day_names[target_date.weekday()]

        # Query meaningful activities on that date
        activities_count = (
            db.query(UserActivity)
            .filter(
                UserActivity.user_id == user_id,
                UserActivity.activity_type.in_(MEANINGFUL_ACTIVITY_TYPES),
                UserActivity.created_at >= datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=timezone.utc),
                UserActivity.created_at <= datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59, tzinfo=timezone.utc),
            )
            .count()
        )
        
        # Calculate active minutes based on meaningful actions count
        minutes = min(120, activities_count * 20)
        weekly.append(
            DailyActivity(
                day=day_str,
                minutes=minutes,
                activities_count=activities_count,
            )
        )

    return weekly


def get_activity_heatmap(db: Session, user_id: int) -> Tuple[List[List[int]], List[HeatmapDay]]:
    """
    Generates 35-day (5 weeks x 7 days) heatmap from meaningful learning events only.
    Excludes raw AI chat message counts to avoid metric inflation.
    """
    now = datetime.now(timezone.utc)
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    days_flat: List[HeatmapDay] = []
    
    # 35 days leading up to today
    for i in range(34, -1, -1):
        target_date = (now - timedelta(days=i)).date()
        day_str = day_names[target_date.weekday()]
        
        count = (
            db.query(UserActivity)
            .filter(
                UserActivity.user_id == user_id,
                UserActivity.activity_type.in_(MEANINGFUL_ACTIVITY_TYPES),
                UserActivity.created_at >= datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=timezone.utc),
                UserActivity.created_at <= datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59, tzinfo=timezone.utc),
            )
            .count()
        )
        
        # Map count to intensity level (0 to 3)
        if count == 0:
            level = 0
        elif count == 1:
            level = 1
        elif count <= 3:
            level = 2
        else:
            level = 3
            
        days_flat.append(
            HeatmapDay(
                date=target_date.strftime("%Y-%m-%d"),
                day=day_str,
                count=count,
                level=level,
            )
        )
        
    # Group into 5 weeks of 7 days (matrix of intensity levels)
    matrix_5x7: List[List[int]] = []
    for w in range(5):
        week_slice = days_flat[w * 7 : (w + 1) * 7]
        matrix_5x7.append([d.level for d in week_slice])
        
    return matrix_5x7, days_flat


def get_recent_activity(db: Session, user_id: int, limit: int = 5) -> List[RecentActivityItem]:
    activities = (
        db.query(UserActivity)
        .filter(UserActivity.user_id == user_id)
        .order_by(desc(UserActivity.created_at))
        .limit(limit)
        .all()
    )
    return [
        RecentActivityItem(
            id=act.id,
            activity_type=act.activity_type,
            activity_title=act.activity_title,
            xp_earned=act.xp_earned,
            created_at=act.created_at,
        )
        for act in activities
    ]


def get_user_progress_overview(db: Session, user: User) -> UserProgressResponse:
    progress = get_or_create_progress(db, user.id)
    level = calculate_level(progress.xp)
    continue_learning = get_continue_learning(db, user.id)
    metrics = get_real_learning_metrics(db, user.id)
    weekly_activity = get_weekly_activity(db, user.id)
    heatmap_matrix, heatmap_days = get_activity_heatmap(db, user.id)
    recent_activity = get_recent_activity(db, user.id)

    # Use first name for greeting if available
    name = user.full_name.split()[0] if user.full_name else "Developer"

    return UserProgressResponse(
        name=name,
        xp=progress.xp,
        level=level,
        streak=progress.streak,
        lessons_completed=metrics["lessons_completed"],
        roadmap_progress_percentage=metrics["roadmap_progress_percentage"],
        quizzes_completed=metrics["quizzes_completed"],
        challenges_passed=metrics["challenges_passed"],
        active_weak_topics_count=metrics["active_weak_topics_count"],
        resolved_topics_count=metrics["resolved_topics_count"],
        continue_learning=continue_learning,
        weekly_activity=weekly_activity,
        heatmap=heatmap_matrix,
        heatmap_days=heatmap_days,
        recent_activity=recent_activity,
    )
