import sys
sys.path.insert(0, ".")

from app.schemas.playground import CodeExecutionRequest
from app.services.code_runner_service import execute_sandboxed_code
from app.services.lesson_service import submit_lesson_quiz
from app.models.lesson import LessonModule
from app.models.user import User
from app.db.database import Base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

def test_phase1_code_runner():
    # 1. Test code runner with STDIN provided
    req = CodeExecutionRequest(
        code="name = input()\nprint(f'Hello {name}')",
        language="python",
        stdin="TechSeeker",
    )
    res = execute_sandboxed_code(req)
    assert res.exit_code == 0, f"Expected 0 exit code, got {res.exit_code} with stderr: {res.stderr}"
    assert "Hello TechSeeker" in res.stdout, f"Expected 'Hello TechSeeker' in stdout, got {res.stdout}"

    # 2. Test code runner without STDIN providing friendly tip
    req_err = CodeExecutionRequest(
        code="name = input()",
        language="python",
        stdin="",
    )
    res_err = execute_sandboxed_code(req_err)
    assert "EOFError" in res_err.stderr
    assert "TechSeeker Sandbox Tip" in res_err.stderr
    print("[PASS] Code Runner STDIN and EOFError tip verified.")

def test_phase1_quiz_evaluation():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()

    user = User(email="p1@techseeker.dev", full_name="Phase1 Tester", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)

    lesson = LessonModule(
        roadmap_module_id=1,
        title="Python Variables",
        lesson_order=1,
        content_json={
            "quiz": [
                {
                    "id": 1,
                    "question": "How to assign variable in Python?",
                    "options": ["x = 10", "var x = 10;", "int x := 10;"],
                    "answer": "x = 10",
                    "explanation": "Variables are dynamically assigned with = in Python."
                }
            ]
        }
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)

    # Correct submission
    ans_correct = {"1": "x = 10"}
    res = submit_lesson_quiz(db, user.id, lesson.id, ans_correct)
    assert res.passed is True
    assert res.score == 1
    assert res.percentage == 100

    # Case-insensitive submission
    ans_case = {"1": "X = 10"}
    res_case = submit_lesson_quiz(db, user.id, lesson.id, ans_case)
    assert res_case.passed is True

    # Incorrect submission
    ans_wrong = {"1": "var x = 10;"}
    res_wrong = submit_lesson_quiz(db, user.id, lesson.id, ans_wrong)
    assert res_wrong.passed is False
    assert res_wrong.score == 0

    print("[PASS] Quiz string-based validation and grading verified.")

if __name__ == "__main__":
    test_phase1_code_runner()
    test_phase1_quiz_evaluation()
    print("ALL PHASE 1 BACKEND TESTS PASSED!")
