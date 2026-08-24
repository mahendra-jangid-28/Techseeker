import math
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.user import User
from app.models.user_progress import UserProgress
from app.models.user_activity import UserActivity
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
    RecentActivityItem,
    UserProgressResponse,
)


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


def get_weekly_activity(db: Session, user_id: int) -> List[DailyActivity]:
    now = datetime.now(timezone.utc)
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    # 7 days leading up to today
    weekly: List[DailyActivity] = []
    
    for i in range(6, -1, -1):
        target_date = (now - timedelta(days=i)).date()
        day_str = day_names[target_date.weekday()]

        # Query activities on that date
        activities_count = (
            db.query(UserActivity)
            .filter(
                UserActivity.user_id == user_id,
                UserActivity.created_at >= datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=timezone.utc),
                UserActivity.created_at <= datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59, tzinfo=timezone.utc),
            )
            .count()
        )
        
        # Calculate active minutes based on actions count
        minutes = min(120, activities_count * 20)
        weekly.append(DailyActivity(day=day_str, minutes=minutes))

    return weekly


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
    weekly_activity = get_weekly_activity(db, user.id)
    recent_activity = get_recent_activity(db, user.id)

    # Use first name for greeting if available
    name = user.full_name.split()[0] if user.full_name else "Developer"

    return UserProgressResponse(
        name=name,
        xp=progress.xp,
        level=level,
        streak=progress.streak,
        continue_learning=continue_learning,
        weekly_activity=weekly_activity,
        recent_activity=recent_activity,
    )
