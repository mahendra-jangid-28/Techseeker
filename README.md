# TechSeeker

An intelligent full-stack learning platform featuring contextual AI mentorship, isolated multi-language code execution, adaptive skill roadmaps, and a portfolio project workspace.

[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python_3.12-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

---

## Key Features

- **Contextual AI Code Mentor & Debugger**: Real-time runtime diagnostics, syntax error triage, algorithmic time/space complexity analysis, and auto-suggested fixes powered by Gemini.
- **Sandboxed Code Execution**: Network-isolated Docker runner supporting Python 3.12, JavaScript (Node.js 20), and C++ (g++ C++17) with strict memory/timeout limits and streaming stdin/stdout.
- **Monaco Code Editor**: Web-based IDE experience with syntax highlighting, custom themes, multi-language switching, and live execution consoles.
- **Adaptive Curriculums & Roadmaps**: Bite-sized interactive lessons, progressive hint ladders, and dynamic quiz verification.
- **Learner Intelligence & Gamification**: XP engine, daily streaks, 35-day activity heatmaps, weak-topic diagnosis, and Next Best Action study recommendations.
- **Portfolio Project Builder**: Multi-file code workspace with automated AI code reviews against standard rubric criteria.
- **Secure Authentication**: Robust session management with JWT auth, password hashing, and Google OAuth 2.0 integration.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Monaco Editor, Lucide Icons |
| **Backend** | FastAPI, SQLAlchemy 2.0 (Async), Alembic, Pydantic v2, Google Gemini SDK |
| **Code Runner** | Docker, isolated Linux subprocess runtime (Python, Node.js, GCC) |
| **Database & Cache** | PostgreSQL 17, Redis |
| **Monorepo Tooling** | Turborepo, pnpm workspaces, uv |

---

## Project Structure

```
TechSeeker/
├── apps/
│   ├── api/          # FastAPI backend (Auth, Learning, Projects, AI Mentor)
│   ├── runner/       # Dockerized multi-language isolated code runner
│   └── web/          # Next.js 15 App Router web client
├── packages/
│   ├── config/       # Shared TypeScript & ESLint configurations
│   ├── types/        # Shared cross-app TypeScript interfaces
│   └── ui/           # Shared reusable React component library
├── docs/             # Technical specifications & architectural blueprints
├── docker-compose.yml # PostgreSQL, Redis, and infrastructure orchestration
├── pnpm-workspace.yaml# Monorepo workspace configuration
└── turbo.json        # Turborepo task pipeline definitions
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18.18.0
- **pnpm** >= 9.0.0
- **Python** >= 3.11
- **uv** (Fast Python package manager)
- **Docker** and **Docker Compose**

---

### Step-by-Step Local Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/mahendra-jangid-28/Techseeker.git
cd Techseeker
```

#### 2. Configure Environment Variables
Copy the template configuration file:
```bash
cp .env.example .env
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
```
> Edit `apps/api/.env` and provide your `GEMINI_API_KEYS` and optional Google OAuth credentials.

#### 3. Start Infrastructure Services
Launch PostgreSQL and Redis:
```bash
docker compose up -d
```

#### 4. Backend Setup (FastAPI + uv)
```bash
cd apps/api

# Create & activate virtual environment with uv
uv venv
# On Windows (PowerShell):
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies using uv
uv pip install -r requirements.txt

# Run database migrations
uv run alembic upgrade head

# Start API dev server
uv run uvicorn app.main:app --reload --port 8000
```

#### 5. Frontend Setup (Next.js)
In a new terminal window from the repository root:
```bash
# Install monorepo dependencies
pnpm install

# Start Next.js web application
pnpm --filter @techseeker/web dev
```

---

## Service URLs

| Service | URL | Description |
|---|---|---|
| **Web Application** | [http://localhost:3000](http://localhost:3000) | Main user interface |
| **Backend API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger UI |
| **API ReDoc** | [http://localhost:8000/redoc](http://localhost:8000/redoc) | OpenAPI documentation |

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
