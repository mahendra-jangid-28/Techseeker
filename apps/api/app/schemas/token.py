from typing import Any
from pydantic import BaseModel, ConfigDict, model_validator
from app.schemas.user import UserResponse


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    token: str | None = None
    user: UserResponse | None = None


class GoogleOAuthRequest(BaseModel):
    idToken: str

    @model_validator(mode="before")
    @classmethod
    def check_token(cls, data: Any) -> Any:
        if isinstance(data, dict):
            token = data.get("idToken") or data.get("id_token")
            if not token or not str(token).strip():
                raise ValueError("idToken is required")
            return {"idToken": str(token).strip()}
        return data

    @property
    def id_token(self) -> str:
        return self.idToken