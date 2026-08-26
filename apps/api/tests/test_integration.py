import sys
import os
sys.path.insert(0, ".")
os.environ["TEST_MODE"] = "1"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.db.dependencies import get_db
import app.models  # Register all tables with Base.metadata

from app.main import app
from app.models.user import User
from app.models.roadmap import Roadmap, RoadmapModule, UserRoadmapSelection, UserRoadmapProgress
from app.models.lesson import LessonModule

# Setup isolated in-memory SQLite test database with StaticPool for cross-thread sharing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_full_production_integration_flow():
    print("\n--- Starting Full Production Integration Flow Test ---")

    # 1. Healthcheck & Security Headers Verification
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "ok"
    assert "X-Request-ID" in res_health.headers
    assert res_health.headers["X-Content-Type-Options"] == "nosniff"
    assert res_health.headers["X-Frame-Options"] == "DENY"
    print("[PASS] Healthcheck & Security Headers verified.")

    # 2. User Registration & Authentication Flow
    reg_payload = {
        "email": "prod_user@techseeker.dev",
        "password": "StrongPassword123!",
        "full_name": "Production Engineer",
    }
    res_reg = client.post("/auth/register", json=reg_payload)
    assert res_reg.status_code == 200, f"Registration failed: {res_reg.text}"
    user_data = res_reg.json()
    assert user_data["email"] == "prod_user@techseeker.dev"

    # Login
    login_data = {
        "username": "prod_user@techseeker.dev",
        "password": "StrongPassword123!",
    }
    res_login = client.post("/auth/login", data=login_data)
    assert res_login.status_code == 200, f"Login failed: {res_login.text}"
    token = res_login.json()["access_token"]
    auth_headers = {"Authorization": f"Bearer {token}"}

    # Verify Profile
    res_me = client.get("/users/me", headers=auth_headers)
    assert res_me.status_code == 200
    assert res_me.json()["full_name"] == "Production Engineer"
    print("[PASS] Register -> Login -> Auth Token flow verified.")

    # 3. AI Mentor Conversation Flow
    res_conv = client.post(
        "/chat/conversations",
        json={"title": "System Architecture Pair Session"},
        headers=auth_headers,
    )
    assert res_conv.status_code == 200
    conv_id = res_conv.json()["id"]

    res_list = client.get("/chat/conversations", headers=auth_headers)
    assert res_list.status_code == 200
    assert any(c["id"] == conv_id for c in res_list.json())
    print("[PASS] AI Mentor Conversation management verified.")

    # 4. Knowledge Explorer: 14-Part Structured Lesson & Level Switch
    res_lesson = client.get(
        "/lessons/structured?topic=Python%20Decorators&level=beginner&language=python",
        headers=auth_headers,
    )
    assert res_lesson.status_code == 200
    lesson = res_lesson.json()
    assert lesson["topic"] == "Python Decorators"
    assert lesson["level"] == "beginner"
    assert lesson["definition"] != ""
    assert lesson["easy_explanation"] != ""
    assert lesson["syntax"] is not None
    assert len(lesson["quiz"]) >= 2
    assert lesson["assignment"]["title"] != ""
    assert lesson["mini_project"]["title"] != ""

    # Switch level to Professional
    res_switch = client.post(
        "/lessons/structured/switch-level",
        json={"topic": "Python Decorators", "level": "professional", "language": "python"},
        headers=auth_headers,
    )
    assert res_switch.status_code == 200
    assert res_switch.json()["level"] == "professional"
    print("[PASS] 14-part Structured Lesson generation and Level Switching verified.")

    # 5. Floating Doubt Resolution Flow
    res_doubt = client.post(
        "/lessons/doubt",
        json={
            "topic": "Python Decorators",
            "current_section": "theory",
            "doubt_type": "explain_easier",
        },
        headers=auth_headers,
    )
    assert res_doubt.status_code == 200
    doubt_resp = res_doubt.json()
    assert doubt_resp["doubt_type"] == "explain_easier"
    assert doubt_resp["answer"] != ""
    assert "confusion_score" in doubt_resp
    print("[PASS] Floating Contextual Doubt Solver verified.")

    # 6. Database Roadmap & Lesson Quiz Grading Flow
    db = TestingSessionLocal()
    roadmap = Roadmap(title="Full-Stack AI Path", description="Path", difficulty="Intermediate", estimated_weeks=10)
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    module = RoadmapModule(roadmap_id=roadmap.id, title="Python Decorators", description="Desc", order_index=1, estimated_hours=3)
    db.add(module)
    db.commit()
    db.refresh(module)

    lesson_db = LessonModule(
        roadmap_module_id=module.id,
        title="Python Decorators",
        lesson_order=1,
        content_json={
            "quiz": [
                {
                    "id": 1,
                    "question": "What symbol is used for decorators in Python?",
                    "options": ["@", "#", "$", "&"],
                    "answer": "@",
                    "explanation": "Decorators use the @ prefix."
                }
            ]
        }
    )
    db.add(lesson_db)

    # User roadmap selection
    db.add(UserRoadmapSelection(user_id=user_data["id"], roadmap_id=roadmap.id))
    db.add(UserRoadmapProgress(user_id=user_data["id"], roadmap_id=roadmap.id, module_id=module.id, status="unlocked"))
    db.commit()
    db.refresh(lesson_db)
    lesson_id = lesson_db.id
    db.close()

    # Submit quiz answers
    res_quiz = client.post(
        f"/lessons/{lesson_id}/quiz",
        json={"answers": {"1": "@"}},
        headers=auth_headers,
    )
    assert res_quiz.status_code == 200
    quiz_result = res_quiz.json()
    assert quiz_result["passed"] is True
    assert quiz_result["score"] == 1
    print("[PASS] Quiz grading and progression feedback verified.")

    # 7. Progress & Single Source of Truth Analytics
    res_progress = client.get("/users/progress", headers=auth_headers)
    assert res_progress.status_code == 200
    prog_data = res_progress.json()
    assert prog_data["xp"] >= 20  # XP awarded for quiz passing
    assert len(prog_data["weekly_activity"]) == 7
    assert len(prog_data["heatmap"]) == 5
    assert len(prog_data["heatmap_days"]) == 35

    # 8. Next Best Action Recommendation Engine
    res_rec = client.get("/users/progress/recommendations", headers=auth_headers)
    assert res_rec.status_code == 200
    rec_data = res_rec.json()
    assert "next_best_action" in rec_data
    assert rec_data["next_best_action"]["title"] != ""
    assert len(rec_data["secondary_recommendations"]) <= 3

    # 9. Learner Snapshot Endpoint
    res_snap = client.get("/users/progress/snapshot", headers=auth_headers)
    assert res_snap.status_code == 200
    snap_data = res_snap.json()
    assert snap_data["user_id"] == user_data["id"]
    assert snap_data["active_roadmap"] == "Full-Stack AI Path"
    print("[PASS] Real Progress Aggregation & Next Best Action Recommendations verified.")

    print("\n=======================================================")
    print("ALL PRODUCTION INTEGRATION TESTS PASSED WITH 100% SUCCESS!")
    print("=======================================================\n")


if __name__ == "__main__":
    test_full_production_integration_flow()
