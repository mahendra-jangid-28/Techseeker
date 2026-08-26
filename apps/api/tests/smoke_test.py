import os
import sys
sys.path.insert(0, ".")
os.environ["TEST_MODE"] = "1"

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base
from app.db.dependencies import get_db
import app.models

from app.main import app
from app.models.user import User
from app.models.roadmap import Roadmap, RoadmapModule, UserRoadmapSelection, UserRoadmapProgress
from app.models.lesson import LessonModule

# Setup in-memory SQLite database
engine = create_engine(
    "sqlite:///:memory:",
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


def run_smoke_test():
    results = []

    # 1. Register
    reg_payload = {
        "email": "smoke_user@techseeker.dev",
        "password": "StrongPassword123!",
        "full_name": "Smoke Tester",
    }
    res_reg = client.post("/auth/register", json=reg_payload)
    results.append(("POST /auth/register", res_reg.status_code, "PASS" if res_reg.status_code == 200 else "FAIL"))
    user_id = res_reg.json().get("id")

    # 2. Login
    login_data = {
        "username": "smoke_user@techseeker.dev",
        "password": "StrongPassword123!",
    }
    res_login = client.post("/auth/login", data=login_data)
    token = res_login.json().get("access_token")
    auth_headers = {"Authorization": f"Bearer {token}"}
    results.append(("POST /auth/login", res_login.status_code, "PASS" if res_login.status_code == 200 else "FAIL"))

    # 3. Mentor (Create Conversation & List)
    res_conv = client.post("/chat/conversations", json={"title": "Smoke Mentor"}, headers=auth_headers)
    results.append(("POST /chat/conversations", res_conv.status_code, "PASS" if res_conv.status_code == 200 else "FAIL"))

    # 4. Lesson Generation (14-part Structured)
    res_lesson = client.get("/lessons/structured?topic=Python%20Classes&level=beginner&language=python", headers=auth_headers)
    results.append(("GET /lessons/structured", res_lesson.status_code, "PASS" if res_lesson.status_code == 200 else "FAIL"))

    # 5. Quiz Submission
    db = TestingSessionLocal()
    roadmap = Roadmap(title="Smoke Track", description="D", difficulty="Beginner", estimated_weeks=4)
    db.add(roadmap)
    db.commit()
    db.refresh(roadmap)

    mod = RoadmapModule(roadmap_id=roadmap.id, title="Python Classes", description="D", order_index=1, estimated_hours=2)
    db.add(mod)
    db.commit()
    db.refresh(mod)

    lesson_db = LessonModule(
        roadmap_module_id=mod.id,
        title="Python Classes",
        lesson_order=1,
        content_json={"quiz": [{"id": 1, "question": "Class keyword?", "options": ["class", "def"], "answer": "class", "explanation": "class keyword"}]}
    )
    db.add(lesson_db)
    db.add(UserRoadmapSelection(user_id=user_id, roadmap_id=roadmap.id))
    db.add(UserRoadmapProgress(user_id=user_id, roadmap_id=roadmap.id, module_id=mod.id, status="unlocked"))
    db.commit()
    db.refresh(lesson_db)
    lesson_id = lesson_db.id
    db.close()

    res_quiz = client.post(f"/lessons/{lesson_id}/quiz", json={"answers": {"1": "class"}}, headers=auth_headers)
    results.append((f"POST /lessons/{lesson_id}/quiz", res_quiz.status_code, "PASS" if res_quiz.status_code == 200 else "FAIL"))

    # 6. Playground (Python Code Runner)
    res_play = client.post("/playground/run", json={"language": "python", "code": "print('Smoke OK')", "stdin": ""})
    results.append(("POST /playground/run", res_play.status_code, "PASS" if res_play.status_code == 200 else "FAIL"))

    # 7. Progress Analytics
    res_prog = client.get("/users/progress", headers=auth_headers)
    results.append(("GET /users/progress", res_prog.status_code, "PASS" if res_prog.status_code == 200 else "FAIL"))

    # 8. Recommendations
    res_rec = client.get("/users/progress/recommendations", headers=auth_headers)
    results.append(("GET /users/progress/recommendations", res_rec.status_code, "PASS" if res_rec.status_code == 200 else "FAIL"))

    print("\n==========================================")
    print("API SMOKE TEST RESULTS")
    print("==========================================")
    for endpoint, status, outcome in results:
        print(f"[{outcome}] {endpoint} -> HTTP {status}")
    print("==========================================\n")


if __name__ == "__main__":
    run_smoke_test()
