import sys
sys.path.insert(0, ".")

from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.user import User
from app.models.user_progress import UserProgress
from app.models.user_activity import UserActivity
from app.models.roadmap import Roadmap, RoadmapModule, UserRoadmapProgress, UserRoadmapSelection
from app.models.weak_topic import WeakTopic
from app.services.progress_service import (
    award_xp,
    get_user_progress_overview,
    get_real_learning_metrics,
    get_activity_heatmap,
    get_weekly_activity,
)

def test_phase2_data_synchronization():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    # 1. Create User
    user = User(email="sync_user@techseeker.dev", full_name="Sync Tester", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)

    # 2. Add Roadmap and Modules
    roadmap = Roadmap(title="AI Engineer Path", description="Path", difficulty="Intermediate", estimated_weeks=12)
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    mod1 = RoadmapModule(roadmap_id=roadmap.id, title="Python Fundamentals", description="Desc", order_index=1, estimated_hours=4)
    mod2 = RoadmapModule(roadmap_id=roadmap.id, title="NumPy Arrays", description="Desc", order_index=2, estimated_hours=5)
    db.add_all([mod1, mod2])
    db.commit()

    # User selects roadmap and completes module 1
    sel = UserRoadmapSelection(user_id=user.id, roadmap_id=roadmap.id)
    prog1 = UserRoadmapProgress(user_id=user.id, roadmap_id=roadmap.id, module_id=mod1.id, status="completed")
    prog2 = UserRoadmapProgress(user_id=user.id, roadmap_id=roadmap.id, module_id=mod2.id, status="unlocked")
    db.add_all([sel, prog1, prog2])
    db.commit()

    # 3. Add Weak Topic
    weak1 = WeakTopic(user_id=user.id, topic="Recursion", failure_count=2, status="active")
    resolved1 = WeakTopic(user_id=user.id, topic="Loops", failure_count=1, successful_attempts=2, status="resolved")
    db.add_all([weak1, resolved1])
    db.commit()

    # 4. Award XP for meaningful learning events
    award_xp(db, user.id, "quiz_completed", "Passed Python Fundamentals Quiz", 20)
    award_xp(db, user.id, "interactive_challenge_passed", "Solved Variable Challenge", 30)
    award_xp(db, user.id, "roadmap_module_completed", "Completed Python Fundamentals", 50)

    # Raw chat message (should NOT count towards learning events heatmap)
    raw_chat = UserActivity(user_id=user.id, activity_type="mentor_chat", activity_title="Chat message", xp_earned=0)
    db.add(raw_chat)
    db.commit()

    # 5. Verify Metrics Calculation
    metrics = get_real_learning_metrics(db, user.id)
    assert metrics["lessons_completed"] == 1
    assert metrics["roadmap_progress_percentage"] == 50  # 1 of 2 modules completed
    assert metrics["quizzes_completed"] == 1
    assert metrics["challenges_passed"] == 1
    assert metrics["active_weak_topics_count"] == 1
    assert metrics["resolved_topics_count"] == 1

    # 6. Verify 35-Day Heatmap
    matrix, days = get_activity_heatmap(db, user.id)
    assert len(matrix) == 5, f"Expected 5 weeks in heatmap matrix, got {len(matrix)}"
    assert all(len(row) == 7 for row in matrix), "Each week must contain 7 days"
    assert len(days) == 35, f"Expected 35 days flat array, got {len(days)}"
    
    # Today has 3 meaningful events (raw chat excluded), so today's level should be 2 (2-3 events)
    today_day = days[-1]
    assert today_day.count == 3, f"Expected 3 meaningful events today, got {today_day.count}"
    assert today_day.level == 2, f"Expected intensity level 2 for 3 events, got {today_day.level}"

    # 7. Verify Overview API Object
    overview = get_user_progress_overview(db, user)
    assert overview.name == "Sync"
    assert overview.xp == 100
    assert overview.level == 2
    assert overview.streak >= 1
    assert overview.lessons_completed == 1
    assert overview.roadmap_progress_percentage == 50
    assert len(overview.weekly_activity) == 7
    assert len(overview.heatmap) == 5

    print("[PASS] Phase 2 Data Synchronization & Heatmap Tests Passed!")

if __name__ == "__main__":
    test_phase2_data_synchronization()
