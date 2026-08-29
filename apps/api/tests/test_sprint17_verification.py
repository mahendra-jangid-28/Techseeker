from unittest.mock import patch, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.database import Base
from app.models.user import User
from app.models.project import Project
from app.models.certificate import Certificate
from app.schemas.project import ProjectCreate, ProjectUpdate
from app.schemas.certificate import CertificateGenerateRequest
from app.services.project_service import (
    create_project,
    get_project_detail,
    update_project,
    evaluate_project_submission,
)
from app.services.certificate_service import (
    generate_certificate,
    get_user_certificates,
    verify_certificate,
)
from app.services.admin_service import get_admin_analytics


def test_portfolio_project_lifecycle_and_evaluation():
    """
    Verifies project creation, multi-file storage, and AI rubric evaluation.
    """
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    user = User(email="builder@techseeker.dev", full_name="Guido van Rossum", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)

    # 1. Create project
    proj_in = ProjectCreate(
        name="Distributed Cache",
        language="python",
        category="Systems",
        difficulty="Advanced",
        tech_stack="Python, Redis, FastAPI",
        description="LRU Cache with TTL",
        code="class LRUCache: pass",
        files={"main.py": "class LRUCache: pass", "README.md": "# Cache"},
    )
    p_created = create_project(db, user, proj_in)
    assert p_created.name == "Distributed Cache"
    assert p_created.status == "draft"

    # 2. Update multi-file codebase
    p_updated = update_project(
        db,
        user,
        p_created.id,
        ProjectUpdate(
            code="class LRUCache:\n    def get(): pass",
            github_url="https://github.com/techseeker/cache",
            live_demo_url="https://cache.techseeker.dev",
        ),
    )
    assert p_updated.github_url == "https://github.com/techseeker/cache"

    # 3. AI Rubric Evaluation
    mock_rubric_json = """
    {
      "functionality_score": 95,
      "functionality_feedback": "LRU eviction logic handles edge cases cleanly.",
      "code_quality_score": 92,
      "code_quality_feedback": "PEP 8 compliant, type hints included.",
      "architecture_score": 90,
      "architecture_feedback": "Modular node design with clean separation.",
      "readability_score": 94,
      "readability_feedback": "Self-documenting method names.",
      "documentation_score": 88,
      "documentation_feedback": "README includes setup instructions.",
      "ui_ux_feedback": "N/A - Backend library",
      "suggestions": ["Add concurrency thread-safety locks"],
      "final_score": 93,
      "passed": true,
      "summary": "Outstanding capstone submission meeting production standards."
    }
    """
    mock_provider = MagicMock()
    mock_provider.generate.return_value = mock_rubric_json

    with patch("app.services.project_service.GeminiProvider", return_value=mock_provider):
        p_evaluated = evaluate_project_submission(db, user, p_created.id)
        assert p_evaluated.score == 93
        assert p_evaluated.status == "completed"
        assert p_evaluated.review_json["passed"] is True


def test_certificate_issuance_and_public_verification():
    """
    Verifies certificate generation, uniqueness, and public verification lookup.
    """
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    user = User(email="grad@techseeker.dev", full_name="Margaret Hamilton", hashed_password="pw")
    db.add(user)
    db.commit()
    db.refresh(user)

    # 1. Generate certificate
    cert_req = CertificateGenerateRequest(
        certificate_type="course",
        title="Full Stack Software Engineering",
        course_name="Full Stack Software Engineering",
    )
    cert = generate_certificate(db, user, cert_req)
    assert cert.recipient_name == "Margaret Hamilton"
    assert cert.verification_code.startswith("TS-")

    # 2. Public verification lookup
    res_valid = verify_certificate(db, cert.verification_code)
    assert res_valid.valid is True
    assert res_valid.recipient_name == "Margaret Hamilton"
    assert res_valid.status == "VERIFIED"

    # 3. Invalid code lookup
    res_invalid = verify_certificate(db, "TS-INVALID-CODE-999")
    assert res_invalid.valid is False
    assert res_invalid.status == "INVALID_OR_NOT_FOUND"


def test_admin_analytics_aggregation():
    """
    Verifies admin analytics aggregation.
    """
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    user = User(email="admin_user@techseeker.dev", full_name="Admin Test", hashed_password="pw")
    db.add(user)
    db.commit()

    analytics = get_admin_analytics(db)
    assert analytics.total_users >= 1
    assert len(analytics.popular_topics) > 0
    assert len(analytics.daily_activity) == 7
