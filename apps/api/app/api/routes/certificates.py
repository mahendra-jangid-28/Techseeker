from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.dependencies import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.certificate import (
    CertificateGenerateRequest,
    CertificateResponse,
    CertificateVerifyResponse,
)
from app.services import certificate_service

router = APIRouter(
    prefix="/certificates",
    tags=["Certificates"],
)


@router.post("/generate", response_model=CertificateResponse)
def generate_cert(
    data: CertificateGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CertificateResponse:
    """
    Issues a tamper-proof, verifiable digital certificate for the current user.
    """
    return certificate_service.generate_certificate(
        db=db,
        user=current_user,
        data=data,
    )


@router.get("/me", response_model=List[CertificateResponse])
def get_my_certificates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[CertificateResponse]:
    """
    Returns all earned certificates for the authenticated user.
    """
    return certificate_service.get_user_certificates(
        db=db,
        user=current_user,
    )


@router.get("/verify/{code}", response_model=CertificateVerifyResponse)
def verify_certificate_public(
    code: str,
    db: Session = Depends(get_db),
) -> CertificateVerifyResponse:
    """
    Publicly verifies a certificate code (no auth required).
    """
    return certificate_service.verify_certificate(
        db=db,
        code=code,
    )
