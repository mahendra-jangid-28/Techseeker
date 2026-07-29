from datetime import datetime

from pydantic import BaseModel


class ConversationCreate(BaseModel):
    title: str | None = "New Chat"


class ConversationResponse(BaseModel):
    id: int
    title: str
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class MessageCreate(BaseModel):
    content: str


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }