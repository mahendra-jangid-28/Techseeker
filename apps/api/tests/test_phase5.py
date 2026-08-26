import sys
sys.path.insert(0, ".")

from datetime import datetime, timezone, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.user import User
from app.models.user_progress import UserProgress
from app.models.user_activity import UserActivity
from app.models.user_memory import UserMemory
from app.models.weak_topic import WeakTopic
from app.models.roadmap import Roadmap, RoadmapModule, UserRoadmapProgress, UserRoadmapSelection
from app.services.learner_intelligence_service import (
    get_learner_snapshot,
    generate_next_best_action,
    get_full_recommendations,
    format_mentor_learner_context,
)
from app.schemas.intelligence import LearnerSnapshot, WeakTopicSnapshot


def setup_test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    return Session()


def test_learner_snapshot_generation():
    db = setup_test_db()

    user = User(email="learner@techseeker.dev", full_name="Brain Tester", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)

    # 1. Progress
    prog = UserProgress(user_id=user.id, xp=350, streak=5, last_active=datetime.now(timezone.utc))
    db.add(prog)

    # 2. Roadmap
    roadmap = Roadmap(title="Full-Stack AI", description="Path", difficulty="Advanced", estimated_weeks=10)
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    mod1 = RoadmapModule(roadmap_id=roadmap.id, title="FastAPI Async", description="Desc", order_index=1, estimated_hours=3)
    mod2 = RoadmapModule(roadmap_id=roadmap.id, title="Vector Databases", description="Desc", order_index=2, estimated_hours=4)
    db.add_all([mod1, mod2])
    db.commit()

    sel = UserRoadmapSelection(user_id=user.id, roadmap_id=roadmap.id)
    r_prog1 = UserRoadmapProgress(user_id=user.id, roadmap_id=roadmap.id, module_id=mod1.id, status="completed")
    r_prog2 = UserRoadmapProgress(user_id=user.id, roadmap_id=roadmap.id, module_id=mod2.id, status="unlocked")
    db.add_all([sel, r_prog1, r_prog2])

    # 3. Weak & Improving Topics
    w_active = WeakTopic(user_id=user.id, topic="Recursion", failure_count=3, attempt_count=4, confidence=0.25, status="active")
    w_imp = WeakTopic(user_id=user.id, topic="Closures", failure_count=2, successful_attempts=1, attempt_count=3, confidence=0.58, status="improving")
    w_res = WeakTopic(user_id=user.id, topic="Variables", failure_count=1, successful_attempts=2, attempt_count=3, confidence=1.0, status="resolved")
    db.add_all([w_active, w_imp, w_res])

    # 4. User Memory
    mem1 = UserMemory(user_id=user.id, memory_key="topic_fastapi", memory_value="FastAPI Async", memory_type="completed_topic", importance=2)
    mem2 = UserMemory(user_id=user.id, memory_key="recent_act", memory_value="Practiced Recursion Base Cases", memory_type="recent_learning_context", importance=1)
    db.add_all([mem1, mem2])

    # 5. Meaningful activities for velocity
    now = datetime.now(timezone.utc)
    for i in range(4):
        act = UserActivity(
            user_id=user.id,
            activity_type="quiz_completed",
            activity_title=f"Quiz {i}",
            xp_earned=20,
            created_at=now - timedelta(days=i),
        )
        db.add(act)
    db.commit()

    # Generate Snapshot
    snapshot = get_learner_snapshot(db, user.id)

    assert snapshot.user_id == user.id
    assert snapshot.xp == 350
    assert snapshot.level == 4  # floor(350/100) + 1 = 4
    assert snapshot.streak == 5
    assert snapshot.active_roadmap == "Full-Stack AI"
    assert snapshot.roadmap_completion_percentage == 50
    assert "FastAPI Async" in snapshot.completed_topics
    assert len(snapshot.active_weak_topics) == 1
    assert snapshot.active_weak_topics[0].topic == "Recursion"
    assert snapshot.active_weak_topics[0].failure_count == 3
    assert "Closures" in snapshot.improving_topics
    assert "Variables" in snapshot.resolved_topics
    assert snapshot.recent_learning_context == "Practiced Recursion Base Cases"
    assert snapshot.learning_velocity == 4

    print("[PASS] Learner Snapshot Generation verified.")


def test_next_best_action_priority():
    db = setup_test_db()
    user = User(email="nba@techseeker.dev", full_name="NBA Tester", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)

    # 1. Priority 1 Test: Active weak topic must take highest precedence
    snap_weak = LearnerSnapshot(
        user_id=user.id,
        level=2,
        xp=150,
        streak=3,
        active_roadmap="AI Engineer",
        active_roadmap_id=1,
        active_weak_topics=[WeakTopicSnapshot(topic="Dynamic Programming", failure_count=4, confidence=0.2, status="active")],
        recent_learning_context="Arrays",
    )
    action1 = generate_next_best_action(snap_weak, db=db)
    assert action1.type == "weak_topic_review"
    assert "Dynamic Programming" in action1.title
    assert "4 failed attempts" in action1.reason
    assert action1.estimated_minutes == 18

    # 2. Priority 2 Test: When no active weak topic, continue active roadmap module
    roadmap = Roadmap(title="Backend Track", description="Desc", difficulty="Beginner", estimated_weeks=8)
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    mod = RoadmapModule(roadmap_id=roadmap.id, title="SQL Joins", description="Desc", order_index=1, estimated_hours=2)
    db.add(mod)
    db.commit()

    u_prog = UserRoadmapProgress(user_id=user.id, roadmap_id=roadmap.id, module_id=mod.id, status="unlocked")
    db.add(u_prog)
    db.commit()

    snap_roadmap = LearnerSnapshot(
        user_id=user.id,
        level=2,
        xp=150,
        streak=3,
        active_roadmap="Backend Track",
        active_roadmap_id=roadmap.id,
        active_weak_topics=[],
        recent_learning_context="SQL Basics",
    )
    action2 = generate_next_best_action(snap_roadmap, db=db)
    assert action2.type == "continue_roadmap"
    assert "SQL Joins" in action2.title

    # 3. Priority 3 Test: Resume incomplete lesson from recent context
    snap_resume = LearnerSnapshot(
        user_id=user.id,
        level=1,
        xp=50,
        streak=1,
        active_roadmap=None,
        active_weak_topics=[],
        recent_learning_context="Binary Search Trees",
    )
    action3 = generate_next_best_action(snap_resume, db=db)
    assert action3.type == "resume_lesson"
    assert "Binary Search Trees" in action3.title

    # 4. Priority 4 Test: Improving topic revision
    snap_improving = LearnerSnapshot(
        user_id=user.id,
        level=1,
        xp=50,
        streak=1,
        active_roadmap=None,
        active_weak_topics=[],
        improving_topics=["Graph Traversal"],
        recent_learning_context=None,
    )
    action4 = generate_next_best_action(snap_improving, db=db)
    assert action4.type == "improving_revision"
    assert "Graph Traversal" in action4.title

    print("[PASS] Next Best Action Priority Rules verified.")


def test_mentor_context_and_recommendations_endpoint():
    db = setup_test_db()
    user = User(email="mentor_rec@techseeker.dev", full_name="Mentor Rec Tester", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)

    w_active = WeakTopic(user_id=user.id, topic="Pointers", failure_count=2, status="active")
    db.add(w_active)
    db.commit()

    recs_res = get_full_recommendations(db, user.id)
    assert recs_res.next_best_action.topic == "Pointers"
    assert "Pointers" in recs_res.weak_topics_to_review
    assert len(recs_res.secondary_recommendations) <= 3

    snapshot = get_learner_snapshot(db, user.id)
    mentor_context = format_mentor_learner_context(snapshot)
    assert "Pointers" in mentor_context
    assert "Active Weak Topics" in mentor_context
    assert "Learner Profile: Level" in mentor_context

    print("[PASS] Mentor Adaptive Context and Recommendations API response verified.")


if __name__ == "__main__":
    test_learner_snapshot_generation()
    test_next_best_action_priority()
    test_mentor_context_and_recommendations_endpoint()
    print("ALL PHASE 5 TESTS PASSED SUCCESSFULLY!")
