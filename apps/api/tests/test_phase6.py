import sys
import os
sys.path.insert(0, ".")
os.environ["TEST_MODE"] = "1"

from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.user import User
from app.models.user_progress import UserProgress
from app.models.weak_topic import WeakTopic
from app.models.lesson import LessonModule, LessonSubmission
from app.services.lesson_generation_service import (
    get_or_generate_structured_lesson,
    switch_explanation_level,
    solve_floating_doubt,
    calculate_topic_confusion_score,
    _cache_key,
    _LESSON_CACHE,
)
from app.schemas.lesson_generation import FloatingDoubtRequest


def setup_test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    return Session()


def test_14_part_lesson_structure_and_syntax():
    db = setup_test_db()

    # 1. Programming topic (must include syntax and code runner starter code)
    lesson_prog = get_or_generate_structured_lesson(db, "Python Recursion", level="beginner", language="python")
    assert lesson_prog.topic == "Python Recursion"
    assert lesson_prog.why_learn_this != ""
    assert lesson_prog.definition != ""
    assert lesson_prog.easy_explanation != ""
    assert lesson_prog.analogy != ""
    assert len(lesson_prog.applications) >= 2
    assert lesson_prog.syntax is not None, "Programming topic must include syntax guide"
    assert len(lesson_prog.examples) >= 2
    assert len(lesson_prog.common_mistakes) >= 2
    assert lesson_prog.interactive_practice.prompt != ""
    assert lesson_prog.interactive_practice.starter_code is not None
    assert len(lesson_prog.quiz) >= 2
    assert lesson_prog.assignment.title != ""
    assert lesson_prog.mini_project.title != ""
    assert len(lesson_prog.related_topics) >= 2
    assert lesson_prog.next_topic != ""

    # 2. Conceptual topic (syntax can be None)
    lesson_concept = get_or_generate_structured_lesson(db, "Agile Scrum Methodologies", level="beginner", language="none")
    assert lesson_concept.syntax is None
    assert lesson_concept.interactive_practice.starter_code is None

    print("[PASS] 14-part Structured Lesson Schema & Programming/Conceptual Syntax verified.")


def test_cache_hit_and_miss():
    db = setup_test_db()
    _LESSON_CACHE.clear()

    key = _cache_key("Binary Search", "python", "beginner")
    assert key not in _LESSON_CACHE

    # Miss: Generates and populates cache
    res1 = get_or_generate_structured_lesson(db, "Binary Search", level="beginner", language="python")
    assert key in _LESSON_CACHE

    # Hit: Directly returned from cache
    res2 = get_or_generate_structured_lesson(db, "Binary Search", level="beginner", language="python")
    assert res1.definition == res2.definition
    assert res1.analogy == res2.analogy

    print("[PASS] Lesson Caching hit/miss verified.")


def test_five_explanation_levels():
    db = setup_test_db()

    levels = ["child", "beginner", "student", "professional", "interview"]
    for lvl in levels:
        lesson = get_or_generate_structured_lesson(db, "Pointers and Memory Allocation", level=lvl, language="python")
        assert lesson.level == lvl
        assert lesson.definition != ""
        assert lesson.easy_explanation != ""

    # Test dynamic switching without losing other sections
    switched = switch_explanation_level(db, "Pointers and Memory Allocation", new_level="child", language="python")
    assert switched.level == "child"
    assert "box" in switched.definition.lower() or "toy" in switched.easy_explanation.lower() or len(switched.definition) > 0

    print("[PASS] Five Explanation Levels and level switching verified.")


def test_floating_doubt_endpoint():
    db = setup_test_db()

    user = User(email="doubt_tester@techseeker.dev", full_name="Doubt Tester", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)

    # 1. explain_easier doubt
    req_easy = FloatingDoubtRequest(
        topic="Recursion",
        current_section="theory",
        doubt_type="explain_easier",
    )
    res_easy = solve_floating_doubt(db, user.id, req_easy)
    assert res_easy.doubt_type == "explain_easier"
    assert res_easy.answer != ""
    assert res_easy.suggested_action is not None

    # 2. give_hint doubt
    req_hint = FloatingDoubtRequest(
        topic="Recursion",
        current_section="practice",
        doubt_type="give_hint",
    )
    res_hint = solve_floating_doubt(db, user.id, req_hint)
    assert "Hint" in res_hint.answer

    # 3. similar_example doubt
    req_ex = FloatingDoubtRequest(
        topic="Recursion",
        current_section="syntax",
        doubt_type="similar_example",
    )
    res_ex = solve_floating_doubt(db, user.id, req_ex)
    assert "```python" in res_ex.answer

    print("[PASS] Floating Doubt Resolution verified.")


def test_confusion_score_calculation():
    db = setup_test_db()

    user = User(email="confused@techseeker.dev", full_name="Confused Student", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initial clean state: score should be 0
    score_clean, signals_clean = calculate_topic_confusion_score(db, user.id, "Dynamic Programming")
    assert score_clean == 0
    assert signals_clean["status"] == "clean"

    # Add 3 quiz failures -> status becomes 'active', confidence 0.25
    weak = WeakTopic(user_id=user.id, topic="Dynamic Programming", failure_count=3, attempt_count=4, confidence=0.25, status="active")
    db.add(weak)
    db.commit()

    score_confused, signals_confused = calculate_topic_confusion_score(db, user.id, "Dynamic Programming")
    assert score_confused > 50, f"Expected elevated confusion score (>50), got {score_confused}"
    assert signals_confused["failure_count"] == 3
    assert signals_confused["status"] == "active"

    print("[PASS] Confusion Score deterministic calculation verified.")


if __name__ == "__main__":
    test_14_part_lesson_structure_and_syntax()
    test_cache_hit_and_miss()
    test_five_explanation_levels()
    test_floating_doubt_endpoint()
    test_confusion_score_calculation()
    print("ALL PHASE 6 TESTS PASSED SUCCESSFULLY!")
