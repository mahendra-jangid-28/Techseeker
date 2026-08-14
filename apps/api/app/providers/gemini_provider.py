from google import genai

from app.core.config import settings
from app.services.system_prompt_service import get_system_prompt


class GeminiProvider:
    def __init__(self):
        self.api_keys = [
            key.strip()
            for key in settings.GEMINI_API_KEYS.split(",")
            if key.strip()
        ]

    def generate(self, messages: list[dict[str, str]]) -> str:
        last_error = None

        for api_key in self.api_keys:
            try:
                client = genai.Client(
                    api_key=api_key,
                )

                response = client.models.generate_content(
                    model="gemini-3.5-flash",
                    contents=messages,
                    config=genai.types.GenerateContentConfig(
                        system_instruction=get_system_prompt(),
                    ),
                )

                return response.text

            except Exception as e:
                last_error = e
                print(f"Gemini API key failed: {e}")

        raise last_error