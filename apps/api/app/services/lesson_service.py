import io
import sys
import contextlib
import httpx
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.roadmap import RoadmapModule
from app.models.lesson import LessonModule, LessonSubmission
from app.schemas.lesson import (
    Assignment,
    ExampleItem,
    HintLadder,
    InteractivePractice,
    LessonContent,
    LessonDetailResponse,
    LessonSubmitResponse,
    QuizQuestion,
    QuizQuestionResult,
    QuizSubmitResponse,
)
from app.schemas.playground import CodeExecutionRequest
from app.services.runner_service import execute_code_via_runner
from app.services.progress_service import award_xp
from app.services.memory_service import (
    normalize_topic_key,
    record_topic_attempt,
    upsert_user_memory,
)



def generate_default_lesson_content(module: RoadmapModule) -> Dict[str, Any]:
    topic = module.title
    return {
        "title": f"Mastering {topic}",
        "objective": f"Understand the core foundations of {topic}, write and run working Python code, and master variable assignment and output.",
        "why_learn": f"{topic} is a fundamental engineering competency in modern programming. Mastering variables and data references allows you to store, manipulate, and pass state throughout applications.",
        "explanation": f"In this module, you will explore how variables work in Python. A variable acts as a named reference or pointer to an object in memory. You assign values using the assignment operator (=), and values can be dynamically updated.",
        "syntax": f"# Python Variables Syntax\n# 1. Assignment: variable_name = value\n# 2. Printing: print(variable_name)\n# 3. Dynamic typing: x = 'Hello' -> x = 42",
        "examples": [
            {
                "title": f"1. Declaring and Printing Variables",
                "explanation": f"Demonstrating basic variable declaration and outputting values with print().",
                "code": f"# Basic variable assignment\nplatform = 'TechSeeker'\nversion = 1.0\nis_active = True\n\nprint(platform)\nprint(f'Version: {{version}}')",
            },
            {
                "title": f"2. Reassigning and Modifying Variables",
                "explanation": f"Variables can be reassigned to new values or combined dynamically.",
                "code": f"# Variable reassignment\ngreeting = 'Welcome'\nuser = 'Developer'\nmessage = f'{{greeting}}, {{user}}!'\n\nprint(message)",
            },
        ],
        "interactive_practice": {
            "prompt": f"Assign the string value \"TechSeeker\" to a variable named `name`, then print the variable using `print(name)`.",
            "starter_code": "name = \"TechSeeker\"\nprint(name)\n",
            "expected_output": "TechSeeker",
            "language": "python",
        },
        "hints": {
            "hint_1": "Create a variable by writing the variable name, an assignment operator (=), and the string value.",
            "hint_2": "Write name = \"TechSeeker\" on the first line.",
            "hint_3": "name = \"TechSeeker\"\nprint(name)",
            "final_solution": "name = \"TechSeeker\"\nprint(name)",
        },
        "quiz": [
            {
                "id": 1,
                "question": "How do you declare and assign a variable in Python?",
                "options": [
                    "x = 10",
                    "var x = 10;",
                    "int x := 10;",
                    "declare x as 10",
                ],
                "answer": "x = 10",
                "explanation": "In Python, variables are created dynamically when you assign a value to them using the = operator.",
            },
            {
                "id": 2,
                "question": "Which of the following is a valid Python variable name?",
                "options": [
                    "2nd_user",
                    "user-name",
                    "user_name",
                    "class",
                ],
                "answer": "user_name",
                "explanation": "Variable names cannot start with numbers, cannot contain hyphens, and cannot use reserved Python keywords like 'class'.",
            },
            {
                "id": 3,
                "question": "What happens when you reassign an existing variable to a new value in Python?",
                "options": [
                    "It raises a TypeError.",
                    "The previous value is permanently locked in memory.",
                    "Python creates a duplicate pointer with a warning.",
                    "The variable now references the new value.",
                ],
                "answer": "The variable now references the new value.",
                "explanation": "Python variables are dynamic references. Reassigning a variable simply points the identifier to the new object in memory.",
            },
        ],
        "assignment": {
            "title": "Python Variables and Data Storage Challenge",
            "description": "Practice declaring variables of different types (strings, integers, floats) and outputting formatted messages.",
            "requirements": [
                "Declare string, integer, and boolean variables with descriptive names.",
                "Use print() statements to output the variable values.",
                "Reassign at least one variable and print its updated value.",
                "Follow PEP 8 snake_case naming conventions for variable names.",
            ],
        },
    }


def get_or_create_lesson_for_module(db: Session, module_id: int) -> LessonDetailResponse:
    module = db.query(RoadmapModule).filter(RoadmapModule.id == module_id).first()
    if not module:
        raise HTTPException(status_code=404, detail="Roadmap module not found")

    lesson = db.query(LessonModule).filter(LessonModule.roadmap_module_id == module_id).first()
    if not lesson:
        content_dict = generate_default_lesson_content(module)
        lesson = LessonModule(
            roadmap_module_id=module.id,
            title=module.title,
            lesson_order=module.order_index,
            content_json=content_dict,
        )
        db.add(lesson)
        db.commit()
        db.refresh(lesson)
    elif "Sum: 47" in str(lesson.content_json):
        # Update stale content from previous seed
        lesson.content_json = generate_default_lesson_content(module)
        db.commit()
        db.refresh(lesson)

    content_data = LessonContent.model_validate(lesson.content_json)

    return LessonDetailResponse(
        id=lesson.id,
        roadmap_module_id=lesson.roadmap_module_id,
        title=lesson.title,
        lesson_order=lesson.lesson_order,
        content=content_data,
        created_at=lesson.created_at,
    )


async def execute_code_safe(code: str, language: str) -> tuple[str, str, int]:
    """
    Attempts to run through the code runner service; if unavailable, falls back to safe local execution for Python.
    """
    try:
        req = CodeExecutionRequest(code=code, language=language)
        result = await execute_code_via_runner(req)
        return result.stdout or "", result.stderr or "", result.exit_code
    except Exception:
        # Fallback local runner for Python in standalone test environments
        if language == "python":
            stdout_buf = io.StringIO()
            stderr_buf = io.StringIO()
            try:
                with contextlib.redirect_stdout(stdout_buf), contextlib.redirect_stderr(stderr_buf):
                    exec(code, {"__name__": "__main__"})
                return stdout_buf.getvalue(), stderr_buf.getvalue(), 0
            except Exception as e:
                return stdout_buf.getvalue(), str(e), 1
        return "", "Execution service unavailable for this language.", 1


async def submit_lesson_code(
    db: Session,
    user_id: int,
    lesson_id: int,
    code: str,
    language: str,
) -> LessonSubmitResponse:
    lesson = db.query(LessonModule).filter(LessonModule.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    content = lesson.content_json
    practice = content.get("interactive_practice", {})
    expected_output = practice.get("expected_output", "").strip()

    stdout, stderr, exit_code = await execute_code_safe(code, language)
    actual_output = stdout.strip()

    passed = (actual_output == expected_output) and (exit_code == 0)
    score = 100 if passed else 0
    feedback = (
        "Excellent work! Your code produced the exact expected output."
        if passed
        else f"Output mismatch. Expected '{expected_output}', but got '{actual_output or stderr}'."
    )

    submission = LessonSubmission(
        user_id=user_id,
        lesson_id=lesson_id,
        code=code,
        language=language,
        passed=passed,
        score=score,
    )
    db.add(submission)
    db.commit()

    # Track deterministic weak topic state
    record_topic_attempt(
        db,
        user_id=user_id,
        topic=lesson.title,
        passed=passed,
    )

    if passed:
        # Award +30 XP for passing interactive coding challenge
        award_xp(
            db,
            user_id=user_id,
            activity_type="interactive_challenge_passed",
            activity_title=f"Solved Challenge: {lesson.title}",
            xp_amount=30,
        )
        norm_key = normalize_topic_key(lesson.title)
        upsert_user_memory(
            db,
            user_id=user_id,
            memory_key=f"completed_topic:{norm_key}",
            memory_value=f"Mastered challenge: {lesson.title}",
            memory_type="completed_topic",
            importance=2,
        )
        upsert_user_memory(
            db,
            user_id=user_id,
            memory_key="recent_learning_context",
            memory_value=f"Practiced coding challenge for {lesson.title}",
            memory_type="recent_learning_context",
            importance=1,
        )
    else:
        upsert_user_memory(
            db,
            user_id=user_id,
            memory_key="recent_learning_context",
            memory_value=f"Working on coding challenge for {lesson.title}",
            memory_type="recent_learning_context",
            importance=1,
        )

    return LessonSubmitResponse(
        passed=passed,
        score=score,
        expected_output=expected_output,
        actual_output=actual_output,
        feedback=feedback,
        error=stderr if stderr else None,
    )


def submit_lesson_quiz(
    db: Session,
    user_id: int,
    lesson_id: int,
    user_answers: Dict[str, str],
) -> QuizSubmitResponse:
    lesson = db.query(LessonModule).filter(LessonModule.id == lesson_id).first()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    quiz_list = lesson.content_json.get("quiz", [])
    total_questions = len(quiz_list)
    correct_count = 0
    results: List[QuizQuestionResult] = []

    for q in quiz_list:
        q_id = str(q["id"])
        selected = user_answers.get(q_id, "").strip()
        correct = q["answer"].strip()
        is_correct = selected.lower() == correct.lower()

        if is_correct:
            correct_count += 1

        results.append(
            QuizQuestionResult(
                question_id=q["id"],
                user_answer=selected,
                correct_answer=correct,
                is_correct=is_correct,
                explanation=q.get("explanation", ""),
            )
        )

    percentage = round((correct_count / total_questions) * 100) if total_questions > 0 else 0
    passed = percentage >= 60

    # Track deterministic weak topic state
    record_topic_attempt(
        db,
        user_id=user_id,
        topic=lesson.title,
        passed=passed,
    )

    if passed:
        award_xp(
            db,
            user_id=user_id,
            activity_type="quiz_completed",
            activity_title=f"Passed Quiz: {lesson.title}",
            xp_amount=20,
        )
        norm_key = normalize_topic_key(lesson.title)
        upsert_user_memory(
            db,
            user_id=user_id,
            memory_key=f"completed_topic:{norm_key}",
            memory_value=f"Passed quiz: {lesson.title}",
            memory_type="completed_topic",
            importance=2,
        )
        upsert_user_memory(
            db,
            user_id=user_id,
            memory_key="recent_learning_context",
            memory_value=f"Passed quiz on {lesson.title} ({percentage}%)",
            memory_type="recent_learning_context",
            importance=1,
        )
    else:
        upsert_user_memory(
            db,
            user_id=user_id,
            memory_key="recent_learning_context",
            memory_value=f"Attempted quiz on {lesson.title} ({percentage}%)",
            memory_type="recent_learning_context",
            importance=1,
        )

    summary = (
        f"Great job! You scored {correct_count}/{total_questions} ({percentage}%)."
        if passed
        else f"Score: {correct_count}/{total_questions} ({percentage}%). Review the explanations and retry."
    )

    return QuizSubmitResponse(
        score=correct_count,
        total=total_questions,
        percentage=percentage,
        passed=passed,
        results=results,
        summary_explanation=summary,
    )

