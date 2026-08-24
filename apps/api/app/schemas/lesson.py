from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ExampleItem(BaseModel):
    title: str
    explanation: str
    code: str


class InteractivePractice(BaseModel):
    prompt: str
    starter_code: str
    expected_output: str
    language: str = "python"


class HintLadder(BaseModel):
    hint_1: str
    hint_2: str
    hint_3: str
    final_solution: str


class QuizQuestion(BaseModel):
    id: int
    question: str
    options: List[str]
    answer: str
    explanation: str


class Assignment(BaseModel):
    title: str
    description: str
    requirements: List[str]


class LessonContent(BaseModel):
    title: str
    objective: str
    why_learn: str
    explanation: str
    syntax: str
    examples: List[ExampleItem]
    interactive_practice: InteractivePractice
    hints: HintLadder
    quiz: List[QuizQuestion]
    assignment: Assignment


class LessonDetailResponse(BaseModel):
    id: int
    roadmap_module_id: int
    title: str
    lesson_order: int
    content: LessonContent
    created_at: datetime


class LessonSubmitRequest(BaseModel):
    code: str
    language: str = "python"


class LessonSubmitResponse(BaseModel):
    passed: bool
    score: int
    expected_output: str
    actual_output: str
    feedback: str
    error: Optional[str] = None


class QuizSubmitRequest(BaseModel):
    answers: Dict[str, str]  # question_id -> selected_option


class QuizQuestionResult(BaseModel):
    question_id: int
    user_answer: str
    correct_answer: str
    is_correct: bool
    explanation: str


class QuizSubmitResponse(BaseModel):
    score: int
    total: int
    percentage: int
    passed: bool
    results: List[QuizQuestionResult]
    summary_explanation: str
