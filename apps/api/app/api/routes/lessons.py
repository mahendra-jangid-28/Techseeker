from fastapi import APIRouter, Depends
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
from app.services.lesson_service import (
    get_or_create_lesson_for_module,
    submit_lesson_code,
    submit_lesson_quiz,
)

router = APIRouter(prefix="/lessons", tags=["Lessons"])


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
