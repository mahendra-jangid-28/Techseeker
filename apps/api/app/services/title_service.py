from app.providers.gemini_provider import GeminiProvider


def generate_title(message: str) -> str:
    prompt = f"""
Generate a very short title (maximum 5 words) for this conversation.

Rules:
- Return only the title.
- No quotes.
- No punctuation at the end.
- Maximum 5 words.

Message:
{message}
"""

    try:
        provider = GeminiProvider()
        title = provider.generate(prompt)

        title = title.strip().replace('"', "")

        if len(title) > 50:
            title = title[:50]

        return title

    except Exception:
        return "New Chat"