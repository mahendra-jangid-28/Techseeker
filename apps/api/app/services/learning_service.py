import json

from fastapi import HTTPException, status
from pydantic import ValidationError

from app.providers.gemini_provider import GeminiProvider
from app.schemas.learning import (
    LearningRequest,
    LearningResponse,
)


def _build_learning_prompt(
    data: LearningRequest,
) -> str:
    return f"""
Generate a complete structured learning lesson.

Topic: {data.topic}
Language: {data.language}
Learner level: {data.level}

You are TechSeeker's AI Learning Engine.

Return ONLY valid JSON.
Do not return markdown.
Do not wrap the JSON in triple backticks.
Do not add any text before or after the JSON.

The response MUST follow this exact structure:

{{
  "topic": "string",

  "why_learn_this": "string",

  "professional_definition": "string",

  "easy_explanation": "string",

  "real_world_analogy": "string",

  "real_world_applications": [
    "string"
  ],

  "syntax_or_core_concepts": "string",

  "examples": [
    {{
      "title": "string",
      "explanation": "string",
      "code": "string or null"
    }}
  ],

  "common_mistakes": [
    "string"
  ],

  "interactive_practice": [
    {{
      "question": "string",
      "hint": "string"
    }}
  ],

  "quiz": [
    {{
      "question": "string",
      "options": [
        "string",
        "string",
        "string",
        "string"
      ],
      "answer": "string",
      "explanation": "string"
    }}
  ],

  "assignment": {{
    "title": "string",
    "description": "string",
    "requirements": [
      "string"
    ]
  }},

  "mini_project": {{
    "title": "string",
    "description": "string",
    "requirements": [
      "string"
    ]
  }},

  "related_topics": [
    "string"
  ],

  "next_topic": "string"
}}

Rules:

1. Adapt the explanation to the learner level.
2. Write the entire lesson in {data.language}.
3. Give at least 2 examples.
4. Give exactly 3 quiz questions.
5. Give useful practical exercises.
6. If the topic is not programming-related, set "code" to null where code is not useful.
7. For non-programming topics, use "syntax_or_core_concepts" to explain the important concepts.
8. Do not invent fake sources or references.
9. Keep the content educational, practical, and accurate.
"""


def _extract_json(
    response_text: str,
) -> dict:
    cleaned_text = response_text.strip()

    if cleaned_text.startswith("```"):
        lines = cleaned_text.splitlines()

        if lines:
            lines = lines[1:]

        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]

        cleaned_text = "\n".join(lines).strip()

    start_index = cleaned_text.find("{")
    end_index = cleaned_text.rfind("}")

    if start_index == -1 or end_index == -1:
        raise ValueError(
            "No valid JSON object found in AI response."
        )

    json_text = cleaned_text[
        start_index:end_index + 1
    ]

    return json.loads(json_text)


def generate_learning_content(
    data: LearningRequest,
) -> LearningResponse:
    prompt = _build_learning_prompt(data)

    messages = [
        {
            "role": "user",
            "parts": [
                {
                    "text": prompt,
                }
            ],
        }
    ]

    try:
        provider = GeminiProvider()

        response_text = provider.generate(
            messages
        )

        response_data = _extract_json(
            response_text
        )

        return LearningResponse.model_validate(
            response_data
        )

    except json.JSONDecodeError as error:
        print(
            f"Learning Engine JSON Error: {error}"
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "AI returned an invalid learning response. "
                "Please try again."
            ),
        )

    except ValidationError as error:
        print(
            f"Learning Engine Validation Error: {error}"
        )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "AI response did not match the required "
                "learning format. Please try again."
            ),
        )

    except HTTPException:
        raise

    except Exception as error:
        print(
            f"Learning Engine Error: {error}"
        )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Learning Engine is temporarily unavailable. "
                "Please try again."
            ),
        )
