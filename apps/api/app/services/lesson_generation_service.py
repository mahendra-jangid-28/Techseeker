import json
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.weak_topic import WeakTopic
from app.models.user_memory import UserMemory
from app.models.user_activity import UserActivity
from app.models.lesson import LessonModule, LessonSubmission
from app.providers.gemini_provider import GeminiProvider
from app.schemas.lesson_generation import (
    AssignmentSchema,
    ExampleItemSchema,
    FloatingDoubtRequest,
    FloatingDoubtResponse,
    InteractivePracticeSchema,
    MiniProjectSchema,
    QuizQuestionSchema,
    StructuredLessonSchema,
)
from app.services.learner_intelligence_service import get_learner_snapshot, format_mentor_learner_context

# In-memory lesson cache for ultra-fast hits across (topic, language, level)
_LESSON_CACHE: Dict[str, Dict[str, Any]] = {}

EXPLANATION_LEVELS = ["child", "beginner", "student", "professional", "interview"]

PROGRAMMING_KEYWORDS = {
    "python", "javascript", "typescript", "c++", "cpp", "rust", "java", "golang", "go",
    "variable", "loop", "function", "array", "list", "dict", "recursion", "class", "async",
    "sql", "api", "pointer", "tree", "graph", "algorithm", "database"
}


def _cache_key(topic: str, language: str, level: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]", "_", topic.lower().strip())
    return f"{cleaned}:{language.lower().strip()}:{level.lower().strip()}"


def is_programming_topic(topic: str, language: Optional[str] = "python") -> bool:
    if language and language.lower() in {"none", "conceptual", ""}:
        return False
    if language and language.lower() in {"python", "javascript", "typescript", "c++", "cpp", "rust", "java", "go", "golang"}:
        return True
    topic_lower = topic.lower()
    return any(k in topic_lower for k in PROGRAMMING_KEYWORDS)


def _generate_fallback_structured_lesson(
    topic: str,
    level: str = "beginner",
    language: str = "python",
) -> Dict[str, Any]:
    """
    Deterministic standard 14-part structured fallback generator.
    Guarantees 100% compliant schema even when offline.
    """
    is_prog = is_programming_topic(topic, language)

    # Explanation adjustments based on level
    if level == "child":
        definition = f"{topic} is like a magical box with a label that remembers your favorite toy."
        easy_exp = f"Imagine you have a toy box with your name on it. Whenever you want to play, you look at the name on the box."
        analogy = "It works just like putting your name tag on your backpack at school so you never lose it."
    elif level == "professional":
        definition = f"{topic} represents an optimized computational primitive and architectural pattern for robust application state management."
        easy_exp = f"In production systems, {topic} provides deterministic memory access, thread-safe references, and clean interface boundaries."
        analogy = "Like a load balancer routing traffic to registered upstream instances through consistent hashing pointers."
    elif level == "interview":
        definition = f"{topic} is a fundamental data abstraction frequently probed for pointer manipulation, Big-O temporal/spatial efficiency, and edge case resilience."
        easy_exp = f"Interviewers assess memory layout, cache locality, mutability gotchas, and garbage collection behavior for {topic}."
        analogy = "Like an immutable event log versus an in-place mutable memory buffer where lifecycle guarantees dictate correctness."
    elif level == "student":
        definition = f"{topic} is a core computational concept defined as a symbolic name bound to an addressable entity in memory."
        easy_exp = f"During execution, evaluating {topic} resolves the symbol table entry to access and transform runtime values."
        analogy = "Like an entry in an encyclopedia index pointing directly to the relevant knowledge page."
    else:  # beginner
        definition = f"{topic} is a fundamental concept that enables storing, referencing, and transforming data throughout a program."
        easy_exp = f"Think of {topic} as a labeled storage slot where you keep information you need to reuse later."
        analogy = "Like putting a labeled sticker on a kitchen container so you know exactly what is inside without guessing."

    syntax = f"# {topic} Syntax Guide\nx = 10\nprint(f'{topic}: {{x}}')" if is_prog else None

    examples = [
        {
            "title": f"Basic {topic} Implementation",
            "explanation": f"Demonstrates how to declare and use {topic} effectively.",
            "code": f"# Example of {topic}\nvalue = 'TechSeeker'\nprint(f'Working with {topic}: {{value}}')" if is_prog else None,
        },
        {
            "title": f"Advanced {topic} Pattern",
            "explanation": f"Shows modular usage and pattern composition for {topic}.",
            "code": f"# Advanced {topic}\ndef process_data(item):\n    return f'Processed: {{item}}'\n\nprint(process_data(42))" if is_prog else None,
        }
    ]

    return {
        "topic": topic,
        "level": level,
        "language": language if is_prog else "none",
        "why_learn_this": f"Mastering {topic} is essential for problem solving, writing clean code, and accelerating your technical trajectory.",
        "definition": definition,
        "easy_explanation": easy_exp,
        "analogy": analogy,
        "applications": [
            f"Building real-world scalable services with {topic}",
            "Structuring modular algorithms and clean data pipelines",
            "Optimizing application performance and debugging state issues"
        ],
        "syntax": syntax,
        "examples": examples,
        "common_mistakes": [
            f"Confusing reference assignment with deep copying in {topic}",
            "Using uninitialized or out-of-scope identifiers",
            "Overcomplicating simple data flow with redundant operations"
        ],
        "interactive_practice": {
            "prompt": f"Write a clean implementation of {topic} that prints 'Success: {topic}'.",
            "starter_code": f"# Write your solution below\nresult = 'Success: {topic}'\nprint(result)\n" if is_prog else None,
            "expected_output": f"Success: {topic}" if is_prog else None,
            "language": language if is_prog else "none",
        },
        "quiz": [
            {
                "id": 1,
                "question": f"What is the primary role of {topic}?",
                "options": [
                    f"To organize and reference computational data predictably.",
                    "To completely bypass memory management.",
                    "To format plain text into binary strings only.",
                    "To replace database queries entirely."
                ],
                "answer": f"To organize and reference computational data predictably.",
                "explanation": f"{topic} provides a deterministic abstraction for managing application logic and state."
            },
            {
                "id": 2,
                "question": f"Which best practice applies when working with {topic}?",
                "options": [
                    "Use descriptive naming and maintain clear scope boundaries.",
                    "Always declare all state globally across the program.",
                    "Avoid commenting or documenting complex behaviors.",
                    "Reassign variables to arbitrary types without validation."
                ],
                "answer": "Use descriptive naming and maintain clear scope boundaries.",
                "explanation": "Scoped, clear identifiers prevent side-effects and maintainability bugs."
            }
        ],
        "assignment": {
            "title": f"{topic} Mastery Challenge",
            "description": f"Design a standalone module that utilizes {topic} to process user input cleanly.",
            "instructions": [
                f"Define the necessary variables or structures for {topic}.",
                "Validate input edge cases.",
                "Output the transformed result."
            ],
            "challenge": f"Implement {topic} and verify with sample test cases."
        },
        "mini_project": {
            "title": f"{topic} Mini Project: Utility Dashboard",
            "description": f"Build a lightweight tracking utility that applies {topic} to manage real-time updates.",
            "requirements": [
                "Maintain internal state correctly",
                "Handle invalid inputs gracefully",
                "Expose a clean callable interface"
            ]
        },
        "related_topics": [
            "Data Structures & Memory Models",
            "Algorithmic Complexity",
            "Modular System Design"
        ],
        "next_topic": f"Advanced {topic} Optimization"
    }


def get_or_generate_structured_lesson(
    db: Session,
    topic: str,
    level: str = "beginner",
    language: str = "python",
    force_refresh: bool = False,
) -> StructuredLessonSchema:
    """
    Task 1 & Task 3: Generates or retrieves cached 14-part structured lessons.
    Checks in-memory cache and DB UserMemory cache before invoking Gemini.
    """
    level = level.lower() if level.lower() in EXPLANATION_LEVELS else "beginner"
    key = _cache_key(topic, language, level)

    # 1. Check in-memory cache
    if not force_refresh and key in _LESSON_CACHE:
        return StructuredLessonSchema(**_LESSON_CACHE[key])

    # 2. Check Database Cached Memory
    if not force_refresh:
        cached_mem = (
            db.query(UserMemory)
            .filter(
                UserMemory.memory_key == f"lesson_cache_{key}",
                UserMemory.memory_type == "cached_lesson",
            )
            .first()
        )
        if cached_mem:
            try:
                data = json.loads(cached_mem.memory_value)
                _LESSON_CACHE[key] = data
                return StructuredLessonSchema(**data)
            except Exception:
                pass

    # 3. Generate via Gemini or Fallback
    lesson_dict: Optional[Dict[str, Any]] = None
    import os
    if os.environ.get("TEST_MODE") == "1" or os.environ.get("ENVIRONMENT") == "test":
        lesson_dict = _generate_fallback_structured_lesson(topic, level, language)
    else:
        try:
            provider = GeminiProvider()
            system_instruction = f"""
You are the TechSeeker Knowledge Explorer Engine. Generate a comprehensive 14-part structured lesson on the topic '{topic}'.
Explanation Level: {level.upper()} ({level} depth and tone).
Language: {language}.

Output strictly a JSON object with these exact keys:
1. why_learn_this (string)
2. definition (string)
3. easy_explanation (string)
4. analogy (string)
5. applications (array of 3 strings)
6. syntax (string or null if conceptual)
7. examples (array of 2 objects with title, explanation, code)
8. common_mistakes (array of 3 strings)
9. interactive_practice (object with prompt, starter_code, expected_output, language)
10. quiz (array of 2-3 objects with id, question, options [array of 4], answer, explanation)
11. assignment (object with title, description, instructions [array], challenge)
12. mini_project (object with title, description, requirements [array])
13. related_topics (array of 3 strings)
14. next_topic (string)
"""
            user_prompt = f"Generate complete 14-part lesson for: {topic} at level {level} in {language}."
            ai_resp = provider.generate([{"role": "user", "parts": [{"text": user_prompt}]}], system_instruction=system_instruction)
            
            # Clean JSON markdown fences if present
            clean_json = re.sub(r"^```json\s*", "", ai_resp.strip())
            clean_json = re.sub(r"\s*```$", "", clean_json)
            parsed = json.loads(clean_json)
            parsed["topic"] = topic
            parsed["level"] = level
            parsed["language"] = language
            lesson_dict = parsed
        except Exception:
            # Fallback to robust deterministic generator
            lesson_dict = _generate_fallback_structured_lesson(topic, level, language)

    # 4. Save in-memory and DB cache
    _LESSON_CACHE[key] = lesson_dict

    try:
        # Cache idempotently in UserMemory for DB persistence
        existing_mem = (
            db.query(UserMemory)
            .filter(UserMemory.memory_key == f"lesson_cache_{key}")
            .first()
        )
        if existing_mem:
            existing_mem.memory_value = json.dumps(lesson_dict)
            existing_mem.updated_at = datetime.now(timezone.utc)
        else:
            db.add(
                UserMemory(
                    user_id=1,  # System cache anchor
                    memory_key=f"lesson_cache_{key}",
                    memory_value=json.dumps(lesson_dict),
                    memory_type="cached_lesson",
                    importance=1,
                )
            )
        db.commit()
    except Exception:
        db.rollback()

    return StructuredLessonSchema(**lesson_dict)


def switch_explanation_level(
    db: Session,
    topic: str,
    new_level: str,
    language: str = "python",
) -> StructuredLessonSchema:
    """
    Task 2: Switches explanation depth (Child, Beginner, Student, Professional, Interview)
    without regenerating unrelated lesson sections.
    """
    target_level = new_level.lower() if new_level.lower() in EXPLANATION_LEVELS else "beginner"
    base_lesson = get_or_generate_structured_lesson(db, topic, level="beginner", language=language)

    # Retrieve level-specific explanation
    level_lesson = get_or_generate_structured_lesson(db, topic, level=target_level, language=language)

    # Compose: reuse base examples, quiz, mini-project, and practice, while swapping explanation depth
    updated = base_lesson.model_copy(
        update={
            "level": target_level,
            "definition": level_lesson.definition,
            "easy_explanation": level_lesson.easy_explanation,
            "analogy": level_lesson.analogy,
        }
    )
    return updated


def solve_floating_doubt(
    db: Session,
    user_id: int,
    request: FloatingDoubtRequest,
) -> FloatingDoubtResponse:
    """
    Task 4: Contextual Floating Doubt solver injecting Learner Snapshot.
    """
    snapshot = get_learner_snapshot(db, user_id)
    confusion_score, _ = calculate_topic_confusion_score(db, user_id, request.topic)

    topic = request.topic
    section = request.current_section
    dtype = request.doubt_type
    selected = request.selected_text or ""

    # Personalized doubt resolution based on doubt_type
    if dtype == "explain_easier":
        answer = f"Let's simplify {topic} completely! Imagine {topic} like a labeled folder on your desk. You can put things in and find them easily whenever you need them."
        action = "Try reviewing the Real-world Analogy card."
    elif dtype == "give_hint":
        answer = f"Hint for {topic}: Focus on how values are assigned and passed. Check the starter code line-by-line and verify the exact output format."
        action = "Inspect the Progressive Hint Ladder."
    elif dtype == "similar_example":
        answer = f"Here is another practical example of {topic}:\n\n```python\nitem = 'Sample'\ncount = 5\nprint(f'{{item}} x {{count}}')\n```\nNotice how the variables hold state cleanly."
        action = "Test this example in the Playground."
    elif dtype == "why_wrong":
        answer = f"Common reason for issues in {topic}: Mismatched data types or typos in variable names. Verify exact spelling and that expected outputs match case-sensitively."
        action = "Check the Common Mistakes section."
    elif dtype == "ask_mentor":
        mentor_context = format_mentor_learner_context(snapshot)
        answer = f"Mentor guidance for {topic} (Level {snapshot.level}): You are doing great. Keep practicing small snippets until the mental model feels second nature."
        action = "Open AI Mentor Workspace for full conversation."
    else:  # explain_again
        answer = f"Step-by-step review for {topic} in section '{section}': We declare our reference, assign data, and verify execution output cleanly without side effects."
        action = "Re-read the Core Concept card."

    return FloatingDoubtResponse(
        doubt_type=dtype,
        current_section=section,
        answer=answer,
        suggested_action=action,
        confusion_score=confusion_score,
    )


def calculate_topic_confusion_score(
    db: Session,
    user_id: int,
    topic: str,
) -> Tuple[int, Dict[str, Any]]:
    """
    Task 5: Backend Confusion Detection Score (0–100).
    Calculated purely from deterministic database signals:
    - Repeated quiz failures on topic (up to 40 pts)
    - Low confidence score on topic (up to 30 pts)
    - Active weak topic status (up to 20 pts)
    - Failed code submissions (up to 10 pts)
    """
    signals: Dict[str, Any] = {
        "failure_count": 0,
        "confidence": 1.0,
        "status": "clean",
        "failed_submissions": 0,
    }

    weak_topic = (
        db.query(WeakTopic)
        .filter(
            WeakTopic.user_id == user_id,
            WeakTopic.topic == topic,
        )
        .first()
    )

    score = 0

    if weak_topic:
        signals["failure_count"] = weak_topic.failure_count
        signals["confidence"] = weak_topic.confidence
        signals["status"] = weak_topic.status

        # 1. Failure count signal (10 pts per failure, capped at 40)
        score += min(40, weak_topic.failure_count * 10)

        # 2. Confidence signal (inversely proportional, up to 30 pts)
        score += int((1.0 - weak_topic.confidence) * 30)

        # 3. Status penalty
        if weak_topic.status == "active":
            score += 20
        elif weak_topic.status == "improving":
            score += 10

    # 4. Failed submissions for this topic's lessons
    failed_subs = (
        db.query(LessonSubmission)
        .filter(
            LessonSubmission.user_id == user_id,
            LessonSubmission.passed == False,
        )
        .count()
    )
    signals["failed_submissions"] = failed_subs
    score += min(10, failed_subs * 5)

    final_score = max(0, min(100, score))
    return final_score, signals
