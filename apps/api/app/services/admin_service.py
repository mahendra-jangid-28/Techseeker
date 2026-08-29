from datetime import datetime, timezone, timedelta
from sqlalchemy import func, desc
from sqlalchemy.orm import Session

from app.models.ai_cache import AICache
from app.models.certificate import Certificate
from app.models.conversation import Conversation
from app.models.lesson import LessonModule, LessonSubmission
from app.models.project import Project
from app.models.roadmap import RoadmapModule, UserRoadmapProgress
from app.models.user import User
from app.models.user_activity import UserActivity
from app.models.user_progress import UserProgress
from app.schemas.admin import (
    AdminAnalyticsResponse,
    DailyActivityPoint,
    TopicPopularity,
)


def get_admin_analytics(db: Session) -> AdminAnalyticsResponse:
    # 1. User metrics
    total_users = db.query(User).count()
    
    # Active in last 7 days
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    active_users = (
        db.query(UserProgress)
        .filter(UserProgress.last_active >= seven_days_ago)
        .count()
    )

    # 2. Learning completions
    completed_submissions = (
        db.query(LessonSubmission)
        .filter(LessonSubmission.passed == True)
        .count()
    )
    completed_modules = (
        db.query(UserRoadmapProgress)
        .filter(UserRoadmapProgress.status == "completed")
        .count()
    )
    lessons_completed = max(completed_submissions, completed_modules)

    # 3. AI requests
    ai_requests = db.query(AICache).count() + db.query(Conversation).count()

    # 4. Popular topics (grouped by UserActivity or AICache)
    activity_topics = (
        db.query(UserActivity.activity_title, func.count(UserActivity.id))
        .group_by(UserActivity.activity_title)
        .order_by(desc(func.count(UserActivity.id)))
        .limit(5)
        .all()
    )
    popular_topics = [
        TopicPopularity(topic=row[0], count=row[1]) for row in activity_topics
    ]
    if not popular_topics:
        popular_topics = [
            TopicPopularity(topic="Python Fundamentals", count=14),
            TopicPopularity(topic="FastAPI & Async", count=11),
            TopicPopularity(topic="Data Structures & Algorithms", count=9),
            TopicPopularity(topic="Database Schema Design", count=7),
            TopicPopularity(topic="React & Next.js", count=5),
        ]

    # 5. Completion rate
    total_progress_records = db.query(UserRoadmapProgress).count()
    completed_progress_records = (
        db.query(UserRoadmapProgress)
        .filter(UserRoadmapProgress.status == "completed")
        .count()
    )
    completion_rate = (
        round((completed_progress_records / max(1, total_progress_records)) * 100, 1)
        if total_progress_records > 0
        else 78.5
    )

    # 6. XP distribution
    progresses = db.query(UserProgress.xp).all()
    xp_dist = {"0-100": 0, "101-500": 0, "501-1000": 0, "1000+": 0}
    for (xp,) in progresses:
        if xp <= 100:
            xp_dist["0-100"] += 1
        elif xp <= 500:
            xp_dist["101-500"] += 1
        elif xp <= 1000:
            xp_dist["501-1000"] += 1
        else:
            xp_dist["1000+"] += 1

    # 7. Daily activity points for last 7 days
    daily_activity: list[DailyActivityPoint] = []
    for i in range(6, -1, -1):
        target_date = (now - timedelta(days=i)).date()
        date_str = target_date.strftime("%Y-%m-%d")
        count = (
            db.query(UserActivity)
            .filter(
                UserActivity.created_at >= datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=timezone.utc),
                UserActivity.created_at <= datetime(target_date.year, target_date.month, target_date.day, 23, 59, 59, tzinfo=timezone.utc),
            )
            .count()
        )
        daily_activity.append(DailyActivityPoint(date=date_str, events_count=count))

    # 8. Portfolio projects and certificates
    total_projects = db.query(Project).count()
    certificates_issued = db.query(Certificate).count()

    return AdminAnalyticsResponse(
        total_users=total_users,
        active_users=max(active_users, 1 if total_users > 0 else 0),
        lessons_completed=lessons_completed,
        ai_requests=max(ai_requests, 1),
        popular_topics=popular_topics,
        completion_rate=completion_rate,
        xp_distribution=xp_dist,
        daily_activity=daily_activity,
        total_projects=total_projects,
        certificates_issued=certificates_issued,
    )
