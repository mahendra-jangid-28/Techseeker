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


class TopicSearchCard(BaseModel):
    title: str
    slug: str
    category: str
    description: str


class TopicSearchResponse(BaseModel):
    query: str
    results: list[TopicSearchCard]


class LearningResponse(BaseModel):
    topic: str
    # 1. WhyLearnThis
    why_learn_this: str
    # 2. ProfessionalDefinition
    professional_definition: str
    # 3. EasyExplanation
    easy_explanation: str
    # 4. RealWorldAnalogy
    real_world_analogy: str
    # 5. Applications
    real_world_applications: list[str]
    # 6. Syntax (optional/core concepts)
    syntax_or_core_concepts: str
    # 7. Examples
    examples: list[ExampleItem]
    # 8. CommonMistakes
    common_mistakes: list[str]
    # 9. Practice
    interactive_practice: list[PracticeItem]
    # 10. Quiz (5 MCQs)
    quiz: list[QuizQuestion]
    # 11. Assignment
    assignment: Assignment
    # 12. MiniProject
    mini_project: MiniProject
    # 13. RelatedTopics
    related_topics: list[str]
    # 14. Summary
    summary: str = ""
    # Next topic suggestion
    next_topic: str = ""
    # Cache indicator
    cached: bool = False
