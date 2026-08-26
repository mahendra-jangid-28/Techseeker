from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.lesson import (
    LessonDetailResponse,
    LessonSubmitRequest,
    LessonSubmitResponse,
    QuizSubmitRequest,
    QuizSubmitResponse,
)
from app.schemas.lesson_generation import (
    ConfusionScoreResponse,
    FloatingDoubtRequest,
    FloatingDoubtResponse,
    LessonGenerationRequest,
    StructuredLessonSchema,
)
from app.services.lesson_service import (
    get_or_create_lesson_for_module,
    submit_lesson_code,
    submit_lesson_quiz,
)
from app.services.lesson_generation_service import (
    calculate_topic_confusion_score,
    get_or_generate_structured_lesson,
    solve_floating_doubt,
    switch_explanation_level,
)

router = APIRouter(prefix="/lessons", tags=["Lessons"])


@router.get("/structured", response_model=StructuredLessonSchema)
def get_structured_lesson(
    topic: str = Query(..., description="Topic to learn"),
    level: str = Query("beginner", description="child, beginner, student, professional, interview"),
    language: str = Query("python", description="Programming language or none for conceptual"),
    force_refresh: bool = Query(False),
    db: Session = Depends(get_db),
):
    return get_or_generate_structured_lesson(
        db=db,
        topic=topic,
        level=level,
        language=language,
        force_refresh=force_refresh,
    )


@router.post("/structured/generate", response_model=StructuredLessonSchema)
def generate_structured_lesson_post(
    payload: LessonGenerationRequest,
    db: Session = Depends(get_db),
):
    return get_or_generate_structured_lesson(
        db=db,
        topic=payload.topic,
        level=payload.level,
        language=payload.language,
        force_refresh=payload.force_refresh,
    )


@router.post("/structured/switch-level", response_model=StructuredLessonSchema)
def switch_level(
    payload: LessonGenerationRequest,
    db: Session = Depends(get_db),
):
    return switch_explanation_level(
        db=db,
        topic=payload.topic,
        new_level=payload.level,
        language=payload.language,
    )


@router.post("/doubt", response_model=FloatingDoubtResponse)
def handle_floating_doubt(
    payload: FloatingDoubtRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return solve_floating_doubt(
        db=db,
        user_id=current_user.id,
        request=payload,
    )


@router.get("/confusion/{topic}", response_model=ConfusionScoreResponse)
def get_confusion_score(
    topic: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    score, signals = calculate_topic_confusion_score(db, current_user.id, topic)
    level_label = "Low" if score <= 25 else "Moderate" if score <= 50 else "Elevated" if score <= 75 else "High"
    return ConfusionScoreResponse(
        user_id=current_user.id,
        topic=topic,
        confusion_score=score,
        level=level_label,
        signals=signals,
    )


@router.get("/{module_id}", response_model=LessonDetailResponse)
def get_lesson(
    module_id: int,
    db: Session = Depends(get_db),
):
    return get_or_create_lesson_for_module(db, module_id)


@router.post("/{lesson_id}/submit", response_model=LessonSubmitResponse)
async def submit_code(
    lesson_id: int,
    payload: LessonSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await submit_lesson_code(
        db=db,
        user_id=current_user.id,
        lesson_id=lesson_id,
        code=payload.code,
        language=payload.language,
    )


@router.post("/{lesson_id}/quiz", response_model=QuizSubmitResponse)
def submit_quiz(
    lesson_id: int,
    payload: QuizSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return submit_lesson_quiz(
        db=db,
        user_id=current_user.id,
        lesson_id=lesson_id,
        user_answers=payload.answers,
    )
