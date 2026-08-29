from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CertificateGenerateRequest(BaseModel):
    certificate_type: str = "course"  # 'lesson', 'course', 'project'
    title: str
    course_name: str
    metadata: Optional[dict] = None


class CertificateResponse(BaseModel):
    id: int
    user_id: int
    certificate_type: str
    title: str
    course_name: str
    recipient_name: str
    verification_code: str
    issue_date: datetime
    metadata_json: Optional[dict] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CertificateVerifyResponse(BaseModel):
    valid: bool
    title: Optional[str] = None
    course_name: Optional[str] = None
    recipient_name: Optional[str] = None
    verification_code: str
    issue_date: Optional[datetime] = None
    certificate_type: Optional[str] = None
    status: str = "VERIFIED"
