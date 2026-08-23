# TechSeeker

An AI-powered coding and learning platform with isolated code execution, contextual AI mentorship, and project persistence.

## Features & Capabilities

- **JWT Authentication**: Secure user registration, password hashing, and session management.
- **Secure Isolated Code Execution**: Network-isolated Docker sandbox with per-process memory limits and execution timeout handling.
- **Multi-Language Support**: Native sandboxed runtime execution for:
  - Python (3.12)
  - JavaScript (Node.js 20)
  - C++ (g++ C++17)
- **Monaco Code Editor**: Real-time syntax highlighting, custom themes, and language switching.
- **Interactive Execution Console**:
  - Live stdout and stderr capture
  - Standard input (stdin) streaming panel
  - Execution latency metrics and exit code badges
  - Strict 64 KB combined output truncation protection
- **AI Code Mentor & Debugger**:
  - Contextual runtime and syntax error explanations powered by Gemini
  - Clean execution quality assessments
  - Time and space complexity analysis
  - Actionable suggested fixes and improved code generation (with one-click copy)
  - Practical programming best-practice tips
- **User Projects & Code Persistence**:
  - Create, save, update, delete, and list projects
  - Restores active editor code, language, and metadata seamlessly
  - Strict user-scoped database isolation

## Project Structure

```
TechSeeker/
├── apps/
│   ├── api/          # FastAPI backend (Auth, Learning, Projects, AI Mentor)
│   ├── runner/       # Dockerized multi-language code runner engine
│   └── web/          # Next.js 15 App Router web application
├── packages/
│   ├── config/       # Shared tooling and linter configs
│   ├── types/        # Shared TypeScript interfaces
│   └── ui/           # Shared UI component library
├── docker-compose.yml # PostgreSQL, Redis, Code Runner & Proxy configuration
└── turbo.json        # Turborepo pipeline configuration
```

## Local Development Setup

### Prerequisites

- Node.js >= 18 and pnpm >= 9
- Python >= 3.11
- Docker and Docker Compose

### 1. Start Infrastructure Services

```bash
docker compose up -d
```

### 2. Backend Setup (FastAPI)

```bash
cd apps/api
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup (Next.js)

```bash
# In the repository root
pnpm install
pnpm --filter @techseeker/web dev
```

- Web Application: [http://localhost:3000](http://localhost:3000)
- Backend API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
