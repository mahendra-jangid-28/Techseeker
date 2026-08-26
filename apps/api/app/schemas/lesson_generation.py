from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ExampleItemSchema(BaseModel):
    title: str
    explanation: str
    code: Optional[str] = None


class InteractivePracticeSchema(BaseModel):
    prompt: str
    starter_code: Optional[str] = None
    expected_output: Optional[str] = None
    language: str = "python"


class QuizQuestionSchema(BaseModel):
    id: int
    question: str
    options: List[str]
    answer: str
    explanation: str


class AssignmentSchema(BaseModel):
    title: str
    description: str
    instructions: List[str] = []
    challenge: str


class MiniProjectSchema(BaseModel):
    title: str
    description: str
    requirements: List[str] = []


class StructuredLessonSchema(BaseModel):
    topic: str
    level: str = "beginner"
    language: str = "python"
    why_learn_this: str
    definition: str
    easy_explanation: str
    analogy: str
    applications: List[str] = []
    syntax: Optional[str] = None
    examples: List[ExampleItemSchema] = []
    common_mistakes: List[str] = []
    interactive_practice: InteractivePracticeSchema
    quiz: List[QuizQuestionSchema] = []
    assignment: AssignmentSchema
    mini_project: MiniProjectSchema
    related_topics: List[str] = []
    next_topic: str


class LessonGenerationRequest(BaseModel):
    topic: str
    level: str = Field(default="beginner", description="child, beginner, student, professional, interview")
    language: str = "python"
    force_refresh: bool = False


class FloatingDoubtRequest(BaseModel):
    lesson_id: Optional[int] = None
    topic: str
    current_section: str  # theory, analogy, syntax, practice, quiz
    selected_text: Optional[str] = None
    doubt_type: str = Field(
        default="explain_again",
        description="explain_again, explain_easier, give_hint, similar_example, why_wrong, ask_mentor",
    )


class FloatingDoubtResponse(BaseModel):
    doubt_type: str
    current_section: str
    answer: str
    suggested_action: Optional[str] = None
    confusion_score: int


class ConfusionScoreResponse(BaseModel):
    user_id: int
    topic: str
    confusion_score: int
    level: str
    signals: Dict[str, Any]
