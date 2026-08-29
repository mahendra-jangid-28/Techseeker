# TechSeeker V1.0 — Architecture & API Documentation

## 1. Overview
TechSeeker is an enterprise-grade AI Programming Mentor, Knowledge Explorer, Interactive Coding Sandbox, and Gamified Career Roadmap platform built with Next.js (App Router), FastAPI, PostgreSQL, SQLAlchemy, and Google Gemini AI.

---

## 2. Environment Variables

### Backend (`apps/api/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URI | `postgresql://postgres:postgres@localhost:5432/techseeker` |
| `GEMINI_API_KEYS` | Comma-separated Gemini API keys for automatic failover | Required |
| `JWT_SECRET_KEY` | Secret key for signing HS256 JWT tokens | Required |
| `JWT_ALGORITHM` | JWT signing algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan | `1440` (24h) |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:3000,http://127.0.0.1:3000` |
| `DEBUG` | Enable verbose debugging logs | `False` |

### Frontend (`apps/web/.env.local`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base API gateway URL | `http://localhost:8000` |

---

## 3. Database Schema

* **`users`**: User identities, credentials, full names, timestamps.
* **`conversations` & `messages`**: Multi-turn mentor chat threads, assistant messages, parent message IDs for branching/regeneration.
* **`projects`**: Multi-file portfolio codebases, tech stacks, live links, GitHub URLs, AI review rubrics, scores, and draft status.
* **`user_progress` & `user_activity`**: Lifetime XP, level progression, active streaks, daily learning actions.
* **`roadmaps`, `roadmap_modules`, `user_roadmap_progress`, `user_roadmap_selection`**: Career pathways, module sequencing, unlock states, mastery tracking.
* **`lesson_modules` & `lesson_submissions`**: 14-part curriculum definitions, user code submissions, quiz evaluations.
* **`user_memory`**: Long-term durable learner memories (goals, preferences, completed topics).
* **`weak_topics`**: Diagnostic state machine (tracking → active → improving → resolved) with confidence scores.
* **`study_recommendations`**: Priority-ranked study action cards.
* **`ai_cache`**: Multi-level curriculum cache (`topic:language:level`) for instant sub-millisecond retrieval.
* **`certificates`**: Verifiable digital credentials with cryptographically unique verification codes.

---

## 4. API Endpoints

### Authentication
* `POST /auth/register` — Create a new learner account.
* `POST /auth/login` — Authenticate and receive JWT bearer token.

### AI Mentor Chat & Streaming
* `GET /chat/conversations` — List user conversations.
* `POST /chat/conversations` — Start a new mentor chat.
* `POST /chat/conversations/{id}/messages` — Send user message and receive AI response.
* `POST /chat/conversations/{id}/stream` — Real-time Server-Sent Events (SSE) streaming with independent DB session lifecycle.
* `POST /chat/messages/{id}/regenerate` — Branch and regenerate assistant response.

### Knowledge Explorer
* `GET /learning/search?q={query}` — Search knowledge catalog and roadmap curriculum.
* `POST /learning/generate` — Generate 14-part structured curriculum with 5 depth levels (`child`, `beginner`, `student`, `professional`, `interview`) and PostgreSQL caching.

### Interactive IDE & Code Runner
* `POST /playground/run` — Sandboxed code execution with STDIN support.
* `POST /playground/testcases` — Execute source code against multiple visible/hidden challenge testcases.
* `POST /playground/review` — Structured AI Code Review with logic, bugs, complexity, and progressive hint ladders.

### Portfolio Projects & Capstone Engine
* `GET /api/v1/projects` — List user portfolio projects.
* `POST /api/v1/projects` — Create new multi-file portfolio project.
* `GET /api/v1/projects/{id}` — Retrieve project codebase and metadata.
* `PUT /api/v1/projects/{id}` — Update multi-file codebase and auto-save drafts.
* `DELETE /api/v1/projects/{id}` — Delete project.
* `POST /api/v1/projects/{id}/evaluate` — Submit codebase for 7-part AI rubric evaluation and earn capstone XP.

### Certificates & Verification
* `POST /certificates/generate` — Issue verifiable digital certificate.
* `GET /certificates/me` — List user's earned credentials.
* `GET /certificates/verify/{code}` — Public endpoint to verify certificate authenticity.

### Gamification & Analytics
* `GET /users/progress` — Progress overview (XP, level, streak, 35-day heatmap).
* `GET /users/progress/recommendations` — Adaptive Next Best Actions.
* `GET /users/weak-topics` — Active weak topics and mastery confidence.
* `GET /admin/analytics` — Platform metrics (active users, completion rates, XP distribution).

---

## 5. Local Development & Run Instructions

```bash
# 1. Start PostgreSQL
# Ensure PostgreSQL 17 is running on port 5432 with database 'techseeker'

# 2. Run Backend
cd apps/api
.venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# 3. Run Frontend
cd apps/web
pnpm dev

# 4. Run Automated Test Suite
cd apps/api
.venv\Scripts\python -m pytest
```
