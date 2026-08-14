from app.models.message import Message


def build_context(messages: list[Message]) -> list[dict[str, str]]:
    context = []

    for message in messages:
        role = "model" if message.role == "assistant" else "user"

        context.append(
            {
                "role": role,
                "parts": [
                    {
                        "text": message.content,
                    }
                ],
            }
        )

    return context