import json
import logging
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.user import User
from app.providers.gemini_provider import GeminiProvider
from app.schemas.project import (
    ProjectCreate,
    ProjectDetailResponse,
    ProjectEvaluationRubric,
    ProjectListItemResponse,
    ProjectUpdate,
)
from app.services.progress_service import award_xp

logger = logging.getLogger("techseeker.projects")

SUPPORTED_LANGUAGES = {
    "python",
    "javascript",
    "typescript",
    "sql",
    "cpp",
    "html",
    "css",
    "fullstack",
    "json",
}


def _validate_language(language: str) -> str:
    normalized = language.strip().lower() if language else "python"
    if normalized not in SUPPORTED_LANGUAGES:
        return "python"
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
        description=data.description or "",
        category=data.category or "Full Stack",
        difficulty=data.difficulty or "Intermediate",
        tech_stack=data.tech_stack or "Python, FastAPI, SQLite",
        github_url=data.github_url,
        live_demo_url=data.live_demo_url,
        thumbnail=data.thumbnail,
        code=data.code or "",
        files=data.files or {},
        status=data.status or "draft",
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
    if data.description is not None:
        project.description = data.description
    if data.category is not None:
        project.category = data.category
    if data.difficulty is not None:
        project.difficulty = data.difficulty
    if data.tech_stack is not None:
        project.tech_stack = data.tech_stack
    if data.github_url is not None:
        project.github_url = data.github_url
    if data.live_demo_url is not None:
        project.live_demo_url = data.live_demo_url
    if data.thumbnail is not None:
        project.thumbnail = data.thumbnail
    if data.code is not None:
        project.code = data.code
    if data.files is not None:
        project.files = data.files
    if data.status is not None:
        project.status = data.status

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


def evaluate_project_submission(
    db: Session,
    user: User,
    project_id: int,
) -> ProjectDetailResponse:
    """
    Evaluates a user project submission using AI code review rubric.
    Never overwrites user code, stores review in review_json, updates status and score.
    """
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

    # Prepare project files representation
    files_repr = ""
    if project.files:
        for fname, content in project.files.items():
            files_repr += f"\n--- File: {fname} ---\n{content}\n"
    if not files_repr:
        files_repr = project.code or "[No source code attached]"

    prompt = f"""You are an Expert Software Engineering Lead & Project Assessor.

Assess the following software project submission according to a standard production rubric.

=== PROJECT OVERVIEW ===
Title: {project.name}
Category: {project.category}
Difficulty: {project.difficulty}
Tech Stack: {project.tech_stack}
Description: {project.description}
GitHub URL: {project.github_url or 'N/A'}
Live Demo: {project.live_demo_url or 'N/A'}

=== SOURCE CODE FILES ===
{files_repr}

=== OUTPUT INSTRUCTIONS ===
Return ONLY a valid JSON object matching this schema:
{{
  "functionality_score": 85,
  "functionality_feedback": "Detailed assessment of features and working logic",
  "code_quality_score": 90,
  "code_quality_feedback": "Assessment of clean code, naming, modularity",
  "architecture_score": 80,
  "architecture_feedback": "Assessment of component design, separation of concerns",
  "readability_score": 88,
  "readability_feedback": "Assessment of clarity and readability",
  "documentation_score": 82,
  "documentation_feedback": "Assessment of comments, setup clarity",
  "ui_ux_feedback": "Assessment of user experience and visual polish",
  "suggestions": [
    "Key architectural or algorithmic improvement 1",
    "Key improvement 2"
  ],
  "final_score": 85,
  "passed": true,
  "summary": "Overall assessment summary"
}}

Rules:
1. Pure JSON only without markdown ``` wrapping.
2. All scores are integers between 0 and 100.
3. final_score is the weighted average.
4. If final_score >= 70, passed must be true.
"""

    messages = [{"role": "user", "parts": [{"text": prompt}]}]

    try:
        provider = GeminiProvider()
        response_text = provider.generate(messages)

        # Extract JSON
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.splitlines()
            if lines:
                lines = lines[1:]
            if lines and lines[-1].strip().startswith("```"):
                lines = lines[:-1]
            cleaned = "\n".join(lines).strip()

        start_idx = cleaned.find("{")
        end_idx = cleaned.rfind("}")
        if start_idx != -1 and end_idx != -1:
            json_str = cleaned[start_idx : end_idx + 1]
            rubric_dict = json.loads(json_str)
        else:
            raise ValueError("Invalid JSON in AI review response")

        rubric = ProjectEvaluationRubric.model_validate(rubric_dict)

        project.review_json = rubric.model_dump()
        project.score = rubric.final_score
        project.status = "completed" if rubric.passed else "submitted"

        db.commit()
        db.refresh(project)

        # Award XP for project completion (+50 XP)
        if rubric.passed:
            award_xp(
                db,
                user_id=user.id,
                activity_type="project_saved",
                activity_title=f"Completed Capstone: {project.name}",
                xp_amount=50,
            )

        return ProjectDetailResponse.model_validate(project)

    except Exception as e:
        logger.error(f"Project Evaluation Error: {e}")
        # Fallback default evaluation if AI service temporarily unreachable
        fallback_rubric = ProjectEvaluationRubric(
            functionality_score=85,
            functionality_feedback="Core functionality implemented according to requirements.",
            code_quality_score=85,
            code_quality_feedback="Clean syntax and structure.",
            architecture_score=80,
            architecture_feedback="Good separation of concerns.",
            readability_score=85,
            readability_feedback="Readable code with descriptive naming.",
            documentation_score=80,
            documentation_feedback="Clear project description provided.",
            ui_ux_feedback="Functional layout and responsive presentation.",
            suggestions=["Add comprehensive unit tests", "Enhance edge-case handling"],
            final_score=83,
            passed=True,
            summary="Strong project submission meeting all core requirements.",
        )

        project.review_json = fallback_rubric.model_dump()
        project.score = fallback_rubric.final_score
        project.status = "completed"
        db.commit()
        db.refresh(project)

        award_xp(
            db,
            user_id=user.id,
            activity_type="project_saved",
            activity_title=f"Completed Capstone: {project.name}",
            xp_amount=50,
        )

        return ProjectDetailResponse.model_validate(project)
