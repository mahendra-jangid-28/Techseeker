import secrets
import string
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.certificate import Certificate
from app.models.user import User
from app.schemas.certificate import (
    CertificateGenerateRequest,
    CertificateResponse,
    CertificateVerifyResponse,
)


def _generate_verification_code() -> str:
    """
    Generates a cryptographically secure, human-readable verification code.
    Format: TS-2026-XXXX-YYYY
    """
    year = datetime.now(timezone.utc).year
    chars = string.ascii_uppercase + string.digits
    part1 = "".join(secrets.choice(chars) for _ in range(4))
    part2 = "".join(secrets.choice(chars) for _ in range(4))
    return f"TS-{year}-{part1}-{part2}"


def generate_certificate(
    db: Session,
    user: User,
    data: CertificateGenerateRequest,
) -> CertificateResponse:
    # Check if a certificate for this exact user & course already exists
    existing = (
        db.query(Certificate)
        .filter(
            Certificate.user_id == user.id,
            Certificate.course_name == data.course_name,
            Certificate.certificate_type == data.certificate_type,
        )
        .first()
    )
    if existing:
        return CertificateResponse.model_validate(existing)

    code = _generate_verification_code()
    # Ensure uniqueness
    while db.query(Certificate).filter(Certificate.verification_code == code).first():
        code = _generate_verification_code()

    recipient = user.full_name.strip() if user.full_name else "TechSeeker Graduate"

    cert = Certificate(
        user_id=user.id,
        certificate_type=data.certificate_type,
        title=data.title,
        course_name=data.course_name,
        recipient_name=recipient,
        verification_code=code,
        metadata_json=data.metadata or {},
    )

    db.add(cert)
    db.commit()
    db.refresh(cert)

    return CertificateResponse.model_validate(cert)


def get_user_certificates(
    db: Session,
    user: User,
) -> List[CertificateResponse]:
    certs = (
        db.query(Certificate)
        .filter(Certificate.user_id == user.id)
        .order_by(Certificate.issue_date.desc())
        .all()
    )
    return [CertificateResponse.model_validate(c) for c in certs]


def verify_certificate(
    db: Session,
    code: str,
) -> CertificateVerifyResponse:
    cert = (
        db.query(Certificate)
        .filter(Certificate.verification_code == code.strip().upper())
        .first()
    )

    if not cert:
        return CertificateVerifyResponse(
            valid=False,
            verification_code=code,
            status="INVALID_OR_NOT_FOUND",
        )

    return CertificateVerifyResponse(
        valid=True,
        title=cert.title,
        course_name=cert.course_name,
        recipient_name=cert.recipient_name,
        verification_code=cert.verification_code,
        issue_date=cert.issue_date,
        certificate_type=cert.certificate_type,
        status="VERIFIED",
    )
