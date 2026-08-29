import json
import logging
from fastapi import HTTPException, status
from pydantic import ValidationError

from app.providers.gemini_provider import GeminiProvider
from app.schemas.code_review import AICodeReviewRequest, AICodeReviewResponse
from app.schemas.debug import CodeDebugRequest, CodeDebugResponse

logger = logging.getLogger("techseeker.debug")


def _build_debug_prompt(data: CodeDebugRequest) -> str:
    exit_status = f"Exit Code: {data.exit_code}" if data.exit_code is not None else "Exit Code: null (Terminated / Timed out)"
    
    return f"""You are TechSeeker's AI Programming Mentor & Code Debugger.

A user has executed their code in the Playground sandbox.
Your job is to analyze their submission, explain errors or code quality, and provide beginner-friendly mentoring feedback.

=== EXECUTION CONTEXT ===
Language: {data.language}
{exit_status}

--- USER SOURCE CODE ---
{data.code}

--- STDOUT ---
{data.stdout if data.stdout else "[No stdout generated]"}

--- STDERR / DIAGNOSTICS ---
{data.stderr if data.stderr else "[No stderr / diagnostics]"}

=== OUTPUT INSTRUCTIONS ===
You MUST return ONLY a valid JSON object conforming exactly to this structure:
{{
  "summary": "string - brief 1-2 sentence high-level assessment of the code and execution outcome",
  "error_type": "string - specific error category (e.g. 'IndexError', 'SyntaxError', 'ZeroDivisionError', 'Timeout / Infinite Loop', 'None - Successful Execution')",
  "explanation": "string - beginner-friendly explanation of why the error happened, or if successful, how the code executed and why it works",
  "fix": "string - clear step-by-step guidance on how to fix the issue, or if successful, advice on potential optimizations or edge cases",
  "improved_code": "string - clean, idiomatic, refactored version of the code that preserves the original intent and behavior",
  "complexity": "string - estimated time and space complexity (e.g. 'Time: O(n), Space: O(1)')",
  "tips": [
    "string - practical programming tip or best practice relevant to this code",
    "string - another helpful tip for the learner"
  ]
}}

CRITICAL RULES:
1. Return ONLY pure JSON. Do NOT wrap with markdown, do NOT write ```json, and do NOT add explanatory text outside the JSON.
2. Never hallucinate fake execution output or imaginary runtime errors.
3. If the code succeeded without error (exit_code == 0 and no error trace), set error_type to "None - Successful Execution" and explain code quality, complexity, and optimizations instead of inventing bugs.
4. "improved_code" must strictly be valid, complete code in {data.language} that preserves the user's original logic/purpose while applying best practices and necessary fixes.
5. Provide at least 2 practical tips in the "tips" array.
6. Keep all explanations accessible, encouraging, and clear for developers of all skill levels.
"""


def _build_review_prompt(data: AICodeReviewRequest) -> str:
    return f"""You are TechSeeker's Senior AI Code Reviewer & Systems Architect.

Review the following source code submission and generate an in-depth, structured engineering review.

=== CODE SUBMISSION ===
Language: {data.language}
Problem / Prompt context: {data.prompt if data.prompt else "General implementation"}

--- SOURCE CODE ---
{data.code}

--- EXECUTION LOGS ---
STDOUT: {data.stdout if data.stdout else "[None]"}
STDERR: {data.stderr if data.stderr else "[None]"}

=== OUTPUT INSTRUCTIONS ===
You MUST return ONLY a valid JSON object conforming exactly to this structure:
{{
  "logic_analysis": "Detailed analysis of the code's logical flow and correctness",
  "readability_score": 8,
  "readability_feedback": "Critique of variable naming, structure, formatting, and clarity",
  "detected_bugs": [
    "Potential bug or runtime hazard 1",
    "Potential bug or runtime hazard 2"
  ],
  "edge_cases": [
    "Edge case consideration 1 (e.g. empty inputs, nulls, boundary values)",
    "Edge case consideration 2"
  ],
  "better_approach": "Architectural or algorithmic recommendation for superior performance and elegance",
  "time_complexity": "Time: O(n log n) or specific complexity",
  "space_complexity": "Space: O(1) auxiliary memory",
  "hint_ladder": [
    "Level 1 Hint: Conceptual clue without giving away code",
    "Level 2 Hint: Strategic algorithmic direction",
    "Level 3 Hint: Key function / data structure suggestion"
  ],
  "overall_verdict": "Clean & Production-Ready | Needs Refactoring | Edge Cases Unhandled | High Performance"
}}

CRITICAL RULES:
1. Return pure JSON only without markdown wrapping or prefix/suffix text.
2. Readability score must be an integer between 1 and 10.
3. "hint_ladder" MUST provide progressive hints that guide the user step-by-step WITHOUT revealing the full final solution immediately.
4. If no bugs are present, return an empty array for "detected_bugs".
5. Be constructive, rigorous, and educational.
"""


def _extract_json(response_text: str) -> dict:
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
        raise ValueError("No valid JSON object found in AI response.")

    json_text = cleaned_text[start_index : end_index + 1]
    return json.loads(json_text)


def analyze_code_execution(data: CodeDebugRequest) -> CodeDebugResponse:
    prompt = _build_debug_prompt(data)
    messages = [{"role": "user", "parts": [{"text": prompt}]}]

    try:
        provider = GeminiProvider()
        response_text = provider.generate(messages)
        response_data = _extract_json(response_text)
        return CodeDebugResponse.model_validate(response_data)

    except json.JSONDecodeError as error:
        logger.error(f"Code Debugger JSON Error: {error}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned an invalid analysis response. Please try again.",
        )
    except ValidationError as error:
        logger.error(f"Code Debugger Validation Error: {error}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI analysis did not match the required response format. Please try again.",
        )
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Code Debugger Error: {error}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Code Mentor is temporarily unavailable. Please try again.",
        )


def generate_ai_code_review(data: AICodeReviewRequest) -> AICodeReviewResponse:
    prompt = _build_review_prompt(data)
    messages = [{"role": "user", "parts": [{"text": prompt}]}]

    try:
        provider = GeminiProvider()
        response_text = provider.generate(messages)
        response_data = _extract_json(response_text)
        return AICodeReviewResponse.model_validate(response_data)

    except json.JSONDecodeError as error:
        logger.error(f"AI Code Review JSON Error: {error}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned an invalid code review response. Please try again.",
        )
    except ValidationError as error:
        logger.error(f"AI Code Review Validation Error: {error}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI code review did not match the required format. Please try again.",
        )
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"AI Code Review Error: {error}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Code Review service is temporarily unavailable. Please try again.",
        )
