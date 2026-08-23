from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.project import (
    ProjectCreate,
    ProjectDetailResponse,
    ProjectListItemResponse,
    ProjectUpdate,
)
from app.services import project_service

router = APIRouter(
    prefix="/api/v1/projects",
    tags=["Projects"],
)


@router.post(
    "",
    response_model=ProjectDetailResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_project(
    data: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectDetailResponse:
    return project_service.create_project(
        db=db,
        user=current_user,
        data=data,
    )


@router.get(
    "",
    response_model=list[ProjectListItemResponse],
)
def list_my_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ProjectListItemResponse]:
    return project_service.get_projects(
        db=db,
        user=current_user,
    )


@router.get(
    "/{project_id}",
    response_model=ProjectDetailResponse,
)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectDetailResponse:
    return project_service.get_project_detail(
        db=db,
        user=current_user,
        project_id=project_id,
    )


@router.put(
    "/{project_id}",
    response_model=ProjectDetailResponse,
)
def update_project(
    project_id: int,
    data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ProjectDetailResponse:
    return project_service.update_project(
        db=db,
        user=current_user,
        project_id=project_id,
        data=data,
    )


@router.delete(
    "/{project_id}",
)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    return project_service.delete_project(
        db=db,
        user=current_user,
        project_id=project_id,
    )
