from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker


from app.db.database import Base
from app.models.user import User
from app.models.roadmap import Roadmap, RoadmapModule, UserRoadmapProgress, UserRoadmapSelection
from app.models.lesson import LessonModule
from app.models.user_memory import UserMemory
from app.models.weak_topic import WeakTopic
from app.models.study_recommendation import StudyRecommendation
from app.services.memory_service import (
    normalize_topic_key,
    upsert_user_memory,
    get_user_memories,
    record_topic_attempt,
    get_active_weak_topics,
    build_personalized_mentor_context,
)
from app.services.recommendation_service import (
    generate_deterministic_recommendations,
    get_recommendations,
    refresh_recommendations,
)
from app.services.system_prompt_service import get_system_prompt


def test_sprint8b_full_suite():
    # Setup in-memory SQLite DB
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSessionLocal()

    # 1. Create User
    user = User(
        email="test_user@techseeker.dev",
        full_name="Alex Developer",
        hashed_password="fakehashpassword123",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 2. Test User Memory Upsert & Idempotency
    norm_key = normalize_topic_key("Mastering Python Variables")
    assert norm_key == "python_variables"

    mem1 = upsert_user_memory(
        db,
        user_id=user.id,
        memory_key=f"completed_topic:{norm_key}",
        memory_value="Mastered Python Variables",
        memory_type="completed_topic",
        importance=2,
    )
    assert mem1.id is not None
    assert mem1.memory_key == "completed_topic:python_variables"

    # Repeated upsert should update, not create duplicate
    mem2 = upsert_user_memory(
        db,
        user_id=user.id,
        memory_key=f"completed_topic:{norm_key}",
        memory_value="Mastered Python Variables with 100% Score",
        memory_type="completed_topic",
        importance=2,
    )
    assert mem1.id == mem2.id
    assert mem2.memory_value == "Mastered Python Variables with 100% Score"

    all_memories = get_user_memories(db, user.id)
    assert len(all_memories) == 1

    # 3. Test Weak Topic State Transitions
    topic = "Python Loops"

    # Attempt 1: First Failure -> status='tracking' (NOT exposed as active weak topic yet)
    wt1 = record_topic_attempt(db, user_id=user.id, topic=topic, passed=False)
    assert wt1.failure_count == 1
    assert wt1.attempt_count == 1
    assert wt1.successful_attempts == 0
    assert wt1.status == "tracking"
    assert len(get_active_weak_topics(db, user.id)) == 0

    # Attempt 2: Second Failure -> status='active' (Exposed as active weak topic)
    wt2 = record_topic_attempt(db, user_id=user.id, topic=topic, passed=False)
    assert wt2.failure_count == 2
    assert wt2.attempt_count == 2
    assert wt2.status == "active"
    active_topics = get_active_weak_topics(db, user.id)
    assert len(active_topics) == 1
    assert active_topics[0].topic == topic

    # Attempt 3: First Success after weakness -> status='improving'
    wt3 = record_topic_attempt(db, user_id=user.id, topic=topic, passed=True)
    assert wt3.successful_attempts == 1
    assert wt3.attempt_count == 3
    assert wt3.status == "improving"
    assert wt3.confidence > 0.3

    # Attempt 4: Second Success -> Recovery achieved -> status='resolved'
    wt4 = record_topic_attempt(db, user_id=user.id, topic=topic, passed=True)
    assert wt4.successful_attempts == 2
    assert wt4.successful_attempts >= wt4.failure_count
    assert wt4.status == "resolved"
    assert wt4.confidence == 1.0
    assert len(get_active_weak_topics(db, user.id)) == 0

    # 4. Test Adaptive Mentor Context Builder
    # Add a roadmap selection
    roadmap = Roadmap(
        title="AI Engineer",
        description="Master AI and Deep Learning",
        difficulty="Advanced",
        estimated_weeks=16,
    )
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    selection = UserRoadmapSelection(user_id=user.id, roadmap_id=roadmap.id)
    db.add(selection)

    # Add an active weak topic for context testing
    record_topic_attempt(db, user_id=user.id, topic="Neural Network Backprop", passed=False)
    record_topic_attempt(db, user_id=user.id, topic="Neural Network Backprop", passed=False)

    # Add a recent learning memory
    upsert_user_memory(
        db,
        user_id=user.id,
        memory_key="recent_learning_context",
        memory_value="Attempted PyTorch Tensors quiz",
        memory_type="recent_learning_context",
    )

    context = build_personalized_mentor_context(db, user.id)
    assert "AI Engineer" in context
    assert "Neural Network Backprop" in context
    assert "PyTorch Tensors" in context

    # Test system prompt injection
    system_prompt = get_system_prompt(context)
    assert "Adaptive Learner Context:" in system_prompt
    assert "AI Engineer" in system_prompt
    assert "Neural Network Backprop" in system_prompt
    assert "Personalization Instructions:" in system_prompt

    # 5. Test Study Recommendations Multi-Priority Engine
    module1 = RoadmapModule(
        roadmap_id=roadmap.id,
        title="Python for AI & Numerical Computing",
        description="NumPy and Vectorization",
        order_index=1,
        estimated_hours=15,
    )
    module2 = RoadmapModule(
        roadmap_id=roadmap.id,
        title="Linear Algebra & Statistics",
        description="Matrices and Gradients",
        order_index=2,
        estimated_hours=20,
    )
    db.add_all([module1, module2])
    db.commit()

    prog1 = UserRoadmapProgress(
        user_id=user.id,
        roadmap_id=roadmap.id,
        module_id=module1.id,
        status="unlocked",
    )
    db.add(prog1)
    db.commit()

    recs = get_recommendations(db, user.id)
    assert len(recs) >= 3

    # Priority 1 must be active weak topic
    assert recs[0].priority == 1
    assert recs[0].recommendation_type == "weak_topic_revision"
    assert recs[0].topic == "Neural Network Backprop"

    # Priority 2 must be unlocked roadmap module
    assert recs[1].priority == 2
    assert recs[1].recommendation_type == "continue_learning"
    assert recs[1].topic == "Python for AI & Numerical Computing"

    # Priority 3 or 4 roadmap or review
    assert any(r.recommendation_type in ["next_roadmap_module", "review", "practice"] for r in recs[2:])

    # Refresh recommendations should recreate without crashing
    refreshed = refresh_recommendations(db, user.id)
    assert len(refreshed) >= 3
    assert refreshed[0].topic == "Neural Network Backprop"

    print("\n[SUCCESS] ALL SPRINT 8B VERIFICATION CHECKS PASSED!")


if __name__ == "__main__":
    test_sprint8b_full_suite()
