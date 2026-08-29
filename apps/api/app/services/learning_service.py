import json
import logging
import re
from typing import List

from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.models.ai_cache import AICache
from app.models.roadmap import RoadmapModule
from app.providers.gemini_provider import GeminiProvider
from app.schemas.learning import (
    LearningRequest,
    LearningResponse,
    TopicSearchCard,
    TopicSearchResponse,
)

logger = logging.getLogger("techseeker.learning")

# Curated catalog of standard engineering topics
CURATED_TOPICS = [
    {
        "title": "Python Programming",
        "slug": "python-programming",
        "category": "Languages",
        "description": "High-level, versatile programming language renowned for simplicity, scripting, web backend, and AI/ML.",
    },
    {
        "title": "TypeScript Foundations",
        "slug": "typescript-foundations",
        "category": "Languages",
        "description": "Typed superset of JavaScript providing static type checking, interfaces, and enterprise scale.",
    },
    {
        "title": "JavaScript (ES6+)",
        "slug": "javascript-es6",
        "category": "Languages",
        "description": "The dynamic language of the web, modern async/await, closures, promises, and the event loop.",
    },
    {
        "title": "React 19 & Modern Hooks",
        "slug": "react-modern-hooks",
        "category": "Frontend",
        "description": "Declarative component-driven UI library utilizing virtual DOM, state hooks, and server components.",
    },
    {
        "title": "Next.js App Router",
        "slug": "nextjs-app-router",
        "category": "Frontend",
        "description": "Full-stack React framework featuring Server Components, streaming SSR, layouts, and fast routing.",
    },
    {
        "title": "FastAPI & Async Python",
        "slug": "fastapi-async-python",
        "category": "Backend",
        "description": "High-performance Python web framework based on Starlette, Pydantic validation, and OpenAPI.",
    },
    {
        "title": "PostgreSQL & Relational Design",
        "slug": "postgresql-relational-design",
        "category": "Databases",
        "description": "Advanced ACID-compliant SQL database covering indexing, query optimization, joins, and transactions.",
    },
    {
        "title": "Redis In-Memory Caching",
        "slug": "redis-in-memory-caching",
        "category": "Databases",
        "description": "Sub-millisecond in-memory data store for caching, pub/sub messaging, rate limiting, and sessions.",
    },
    {
        "title": "Docker & Containerization",
        "slug": "docker-containerization",
        "category": "DevOps",
        "description": "Lightweight container runtime packaging code and dependencies for reproducible deployments.",
    },
    {
        "title": "Kubernetes Cluster Orchestration",
        "slug": "kubernetes-cluster-orchestration",
        "category": "DevOps",
        "description": "Production-grade container orchestration system for automated scaling, healing, and service discovery.",
    },
    {
        "title": "Data Structures & Algorithms",
        "slug": "data-structures-and-algorithms",
        "category": "Computer Science",
        "description": "Arrays, linked lists, hash tables, trees, heaps, dynamic programming, and Big-O complexity analysis.",
    },
    {
        "title": "System Design & Distributed Systems",
        "slug": "system-design-distributed-systems",
        "category": "Architecture",
        "description": "Scalable systems architecture, load balancing, CAP theorem, replication, sharding, and caching tiers.",
    },
    {
        "title": "Git & Collaborative Workflows",
        "slug": "git-collaborative-workflows",
        "category": "Tools",
        "description": "Distributed version control system, branching strategies, rebasing, merge conflict resolution, and PRs.",
    },
    {
        "title": "REST APIs & OpenAPI Specification",
        "slug": "rest-apis-openapi",
        "category": "Backend",
        "description": "Architectural principles of RESTful services, HTTP status codes, idempotency, and automated API specs.",
    },
    {
        "title": "GraphQL APIs",
        "slug": "graphql-apis",
        "category": "Backend",
        "description": "Query language for APIs providing clients exact data fetching, schema definitions, and resolvers.",
    },
    {
        "title": "WebSockets & Real-Time Communication",
        "slug": "websockets-realtime",
        "category": "Networking",
        "description": "Full-duplex persistent bidirectional communication protocols for real-time live events and chat.",
    },
    {
        "title": "OAuth 2.0 & JWT Authentication",
        "slug": "oauth2-jwt-authentication",
        "category": "Security",
        "description": "Modern authorization frameworks, bearer tokens, cryptographic signing, claims, and refresh tokens.",
    },
    {
        "title": "CI/CD Automated Pipelines",
        "slug": "cicd-automated-pipelines",
        "category": "DevOps",
        "description": "Automated build, test, and deployment workflows using GitHub Actions and automated quality gates.",
    },
    {
        "title": "Linux & Bash Scripting",
        "slug": "linux-bash-scripting",
        "category": "DevOps",
        "description": "Command-line fundamentals, POSIX pipelines, shell automation, permissions, and process management.",
    },
    {
        "title": "Machine Learning & LLM Fundamentals",
        "slug": "machine-learning-llms",
        "category": "AI/ML",
        "description": "Core concepts of neural networks, embeddings, transformers, prompt engineering, and LLM orchestration.",
    },
]


def _build_learning_prompt(data: LearningRequest) -> str:
    level_instructions = {
        "child": "Explain like I'm a 5-year-old child using simple language, fun everyday analogies (toys, games, cooking), and zero jargon.",
        "beginner": "Explain for a complete programming beginner with clear intuitive concepts, step-by-step guidance, and friendly clarity.",
        "student": "Explain with Computer Science academic rigor, formal definitions, computational trade-offs, and clean architectural patterns.",
        "professional": "Explain for a senior software engineer focusing on production architecture, system trade-offs, performance optimization, concurrency, security, and enterprise best practices.",
        "interview": "Explain for technical coding and system design interviews (e.g. FAANG), covering common interview problems, algorithmic patterns, edge cases, complexity analysis, and interviewer follow-up questions.",
    }

    instruction = level_instructions.get(
        data.level.lower(),
        level_instructions["beginner"],
    )

    return f"""
Generate a complete 14-part structured learning lesson.

Topic: {data.topic}
Language: {data.language}
Learner level: {data.level} ({instruction})

You are TechSeeker's AI Learning Engine.

Return ONLY a valid JSON object.
Do not return markdown.
Do not wrap the JSON in triple backticks.
Do not add any text before or after the JSON.

The response MUST follow this exact 14-part structure:

{{
  "topic": "{data.topic}",
  "why_learn_this": "Detailed explanation of why this topic is essential",
  "professional_definition": "Precise, industry-standard definition",
  "easy_explanation": "Intuitive explanation tailored specifically to the {data.level} level",
  "real_world_analogy": "Memorable real-world analogy illustrating the mechanism",
  "real_world_applications": [
    "Practical real-world application 1",
    "Practical real-world application 2",
    "Practical real-world application 3"
  ],
  "syntax_or_core_concepts": "Detailed syntax reference or core conceptual anatomy",
  "examples": [
    {{
      "title": "Example 1 Title",
      "explanation": "Clear explanation of Example 1",
      "code": "Working code snippet or null if conceptual"
    }},
    {{
      "title": "Example 2 Title",
      "explanation": "Clear explanation of Example 2",
      "code": "Working code snippet or null if conceptual"
    }}
  ],
  "common_mistakes": [
    "Common mistake or pitfall 1",
    "Common mistake or pitfall 2",
    "Common mistake or pitfall 3"
  ],
  "interactive_practice": [
    {{
      "question": "Practice challenge question 1",
      "hint": "Helpful hint for challenge 1"
    }},
    {{
      "question": "Practice challenge question 2",
      "hint": "Helpful hint for challenge 2"
    }}
  ],
  "quiz": [
    {{
      "question": "Multiple choice question 1?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Exact matching string of correct option",
      "explanation": "Detailed explanation of why this option is correct"
    }},
    {{
      "question": "Multiple choice question 2?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Exact matching string of correct option",
      "explanation": "Detailed explanation of why this option is correct"
    }},
    {{
      "question": "Multiple choice question 3?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Exact matching string of correct option",
      "explanation": "Detailed explanation of why this option is correct"
    }},
    {{
      "question": "Multiple choice question 4?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Exact matching string of correct option",
      "explanation": "Detailed explanation of why this option is correct"
    }},
    {{
      "question": "Multiple choice question 5?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": "Exact matching string of correct option",
      "explanation": "Detailed explanation of why this option is correct"
    }}
  ],
  "assignment": {{
    "title": "Hands-on Assignment Title",
    "description": "Comprehensive practical assignment description",
    "requirements": [
      "Requirement 1",
      "Requirement 2",
      "Requirement 3"
    ]
  }},
  "mini_project": {{
    "title": "Mini Project Title",
    "description": "End-to-end mini project description",
    "requirements": [
      "Project deliverable 1",
      "Project deliverable 2",
      "Project deliverable 3"
    ]
  }},
  "related_topics": [
    "Related Topic 1",
    "Related Topic 2",
    "Related Topic 3",
    "Related Topic 4"
  ],
  "summary": "Key takeaways and recap summary of the lesson",
  "next_topic": "Recommended next topic to master"
}}

Rules:
1. Tailor the tone, depth, and vocabulary strictly to the '{data.level}' explanation level.
2. Write the entire lesson in {data.language}.
3. Give at least 2 practical examples.
4. Give EXACTLY 5 quiz questions. Each question MUST have exactly 4 options. The 'answer' MUST match one of the 4 options verbatim.
5. Randomize the correct answer placement (do not always place correct answer as first or second option).
6. Provide clear, educational, and production-accurate content.
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


def search_topics(query: str, db: Session | None = None) -> TopicSearchResponse:
    """
    Search topics across curated catalog, roadmap modules, and cached topics.
    Supports title, slug, and partial matches.
    """
    q = (query or "").strip().lower()
    results: List[TopicSearchCard] = []
    seen_titles = set()

    def add_card(title: str, slug: str, category: str, description: str):
        norm = title.strip().lower()
        if norm not in seen_titles:
            seen_titles.add(norm)
            results.append(
                TopicSearchCard(
                    title=title.strip(),
                    slug=slug.strip(),
                    category=category.strip(),
                    description=description.strip(),
                )
            )

    # 1. Search Curated Catalog
    for item in CURATED_TOPICS:
        if (
            not q
            or q in item["title"].lower()
            or q in item["slug"].lower()
            or q in item["description"].lower()
            or q in item["category"].lower()
        ):
            add_card(
                title=item["title"],
                slug=item["slug"],
                category=item["category"],
                description=item["description"],
            )

    # 2. Search Database Roadmap Modules
    if db is not None:
        try:
            modules = db.query(RoadmapModule).all()
            for mod in modules:
                if (
                    not q
                    or q in mod.title.lower()
                    or (mod.description and q in mod.description.lower())
                ):
                    slug = re.sub(r"[^\w\s-]", "", mod.title.lower()).strip().replace(" ", "-")
                    add_card(
                        title=mod.title,
                        slug=slug or f"module-{mod.id}",
                        category="Roadmap Curriculum",
                        description=mod.description or f"Roadmap Module {mod.order_index} in career track.",
                    )
        except Exception as e:
            logger.warning(f"Failed to query roadmap modules during search: {e}")

    # 3. If query is specific and not found, provide an instant exploration card
    if q and len(results) == 0:
        formatted_title = q.title()
        slug = re.sub(r"[^\w\s-]", "", q.lower()).strip().replace(" ", "-")
        add_card(
            title=formatted_title,
            slug=slug or "custom-topic",
            category="Custom Exploration",
            description=f"Explore AI-generated 14-part curriculum for {formatted_title}.",
        )

    return TopicSearchResponse(query=query, results=results[:20])


def generate_learning_content(
    data: LearningRequest,
    db: Session | None = None,
) -> LearningResponse:
    """
    14-part structured lesson generation with AI Cache.
    Cache key: topic + language + level
    """
    cache_key = f"{data.topic.lower().strip()}:{data.language.lower().strip()}:{data.level.lower().strip()}"

    # 1. Check AI Cache in Database
    if db is not None:
        try:
            cached_entry = (
                db.query(AICache)
                .filter(AICache.cache_key == cache_key)
                .first()
            )
            if cached_entry and cached_entry.response_json:
                logger.info(f"[AI CACHE HIT] topic='{data.topic}' level='{data.level}'")
                response_data = dict(cached_entry.response_json)
                response_data["cached"] = True
                return LearningResponse.model_validate(response_data)
        except Exception as e:
            logger.warning(f"AI Cache lookup failed: {e}")

    logger.info(f"[AI CACHE MISS] Generating topic='{data.topic}' level='{data.level}' via Gemini")

    # 2. Call Gemini
    prompt = _build_learning_prompt(data)
    messages = [{"role": "user", "parts": [{"text": prompt}]}]

    try:
        provider = GeminiProvider()
        response_text = provider.generate(messages)
        response_data = _extract_json(response_text)
        response_data["cached"] = False

        # Validate with Pydantic
        lesson_response = LearningResponse.model_validate(response_data)

        # 3. Store in Database Cache
        if db is not None:
            try:
                new_cache = AICache(
                    cache_key=cache_key,
                    topic=data.topic.strip(),
                    language=data.language.strip(),
                    level=data.level.strip(),
                    response_json=lesson_response.model_dump(exclude={"cached"}),
                )
                db.add(new_cache)
                db.commit()
                logger.info(f"[AI CACHE SAVED] Saved lesson '{cache_key}' to database cache")
            except Exception as e:
                db.rollback()
                logger.warning(f"Failed to persist lesson to AI Cache: {e}")

        return lesson_response

    except json.JSONDecodeError as error:
        logger.error(f"Learning Engine JSON Error: {error}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned an invalid learning response. Please try again.",
        )
    except ValidationError as error:
        logger.error(f"Learning Engine Validation Error: {error}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI response did not match the required 14-part learning format. Please try again.",
        )
    except HTTPException:
        raise
    except Exception as error:
        logger.error(f"Learning Engine Error: {error}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Learning Engine is temporarily unavailable. Please try again.",
        )
