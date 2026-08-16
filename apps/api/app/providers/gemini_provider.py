from google import genai
from google.genai.errors import APIError, ClientError, ServerError

from app.core.config import settings
from app.services.system_prompt_service import get_system_prompt


class GeminiProvider:
    def __init__(self):
        self.api_keys = [
            key.strip()
            for key in settings.GEMINI_API_KEYS.split(",")
            if key.strip()
        ]

        if not self.api_keys:
            raise ValueError("No Gemini API keys configured.")

    def generate(self, messages: list[dict[str, str]]) -> str:
        last_error = None

        for index, api_key in enumerate(self.api_keys, start=1):
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

                if not response.text:
                    raise RuntimeError("Gemini returned an empty response.")

                return response.text.strip()

            except (APIError, ClientError, ServerError) as e:
                last_error = e
                status_code = getattr(e, "status", None)

                print(
                    f"Gemini API attempt {index}/{len(self.api_keys)} failed "
                    f"with status {status_code}: {e}"
                )

                if status_code in {400}:
                    raise

                continue

            except Exception as e:
                last_error = e

                print(
                    f"Gemini API attempt {index}/{len(self.api_keys)} "
                    f"failed with unexpected error: {e}"
                )

                raise

        raise last_error