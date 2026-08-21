from pydantic import BaseModel, Field


class LearningRequest(BaseModel):
    topic: str = Field(
        min_length=1,
        max_length=200,
    )
    language: str = Field(
        default="English",
        min_length=1,
        max_length=50,
    )
    level: str = Field(
        default="beginner",
        min_length=1,
        max_length=50,
    )


class ExampleItem(BaseModel):
    title: str
    explanation: str
    code: str | None = None


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str
    explanation: str


class PracticeItem(BaseModel):
    question: str
    hint: str


class Assignment(BaseModel):
    title: str
    description: str
    requirements: list[str]


class MiniProject(BaseModel):
    title: str
    description: str
    requirements: list[str]


class LearningResponse(BaseModel):
    topic: str

    why_learn_this: str

    professional_definition: str

    easy_explanation: str

    real_world_analogy: str

    real_world_applications: list[str]

    syntax_or_core_concepts: str

    examples: list[ExampleItem]

    common_mistakes: list[str]

    interactive_practice: list[PracticeItem]

    quiz: list[QuizQuestion]

    assignment: Assignment

    mini_project: MiniProject

    related_topics: list[str]

    next_topic: str
