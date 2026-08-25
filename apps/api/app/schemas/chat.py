from datetime import datetime

from pydantic import BaseModel, ConfigDict


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
    is_current: bool = True
    parent_message_id: int | None = None
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }



class ConversationDetailResponse(BaseModel):
    id: int
    title: str
    created_at: datetime
    messages: list[MessageResponse]

    model_config = {
        "from_attributes": True,
    }

class MessageCreate(BaseModel):
    content: str


class ChatResponse(BaseModel):
    user_message: MessageResponse
    assistant_message: MessageResponse

    model_config = ConfigDict(from_attributes=True)


ChatMessageCreate = MessageCreate