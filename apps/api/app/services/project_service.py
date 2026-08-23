from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectDetailResponse,
    ProjectListItemResponse,
    ProjectUpdate,
)

SUPPORTED_LANGUAGES = {"python", "javascript", "cpp"}


def _validate_language(language: str) -> str:
    normalized = language.strip().lower() if language else ""
    if normalized not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported language: {language}",
        )
    return normalized


def create_project(
    db: Session,
    user: User,
    data: ProjectCreate,
) -> ProjectDetailResponse:
    validated_lang = _validate_language(data.language)

    project = Project(
        user_id=user.id,
        name=data.name.strip(),
        language=validated_lang,
        code=data.code,
    )

    db.add(project)
    db.commit()
    db.refresh(project)

    return ProjectDetailResponse.model_validate(project)


def get_projects(
    db: Session,
    user: User,
) -> list[ProjectListItemResponse]:
    projects = (
        db.query(Project)
        .filter(Project.user_id == user.id)
        .order_by(Project.updated_at.desc())
        .all()
    )

    return [ProjectListItemResponse.model_validate(p) for p in projects]


def get_project_detail(
    db: Session,
    user: User,
    project_id: int,
) -> ProjectDetailResponse:
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.user_id == user.id,
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    return ProjectDetailResponse.model_validate(project)


def update_project(
    db: Session,
    user: User,
    project_id: int,
    data: ProjectUpdate,
) -> ProjectDetailResponse:
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.user_id == user.id,
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    if data.name is not None:
        project.name = data.name.strip()

    if data.language is not None:
        project.language = _validate_language(data.language)

    if data.code is not None:
        project.code = data.code

    db.commit()
    db.refresh(project)

    return ProjectDetailResponse.model_validate(project)


def delete_project(
    db: Session,
    user: User,
    project_id: int,
) -> dict:
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            Project.user_id == user.id,
        )
        .first()
    )

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    db.delete(project)
    db.commit()

    return {"message": "Project deleted successfully"}
