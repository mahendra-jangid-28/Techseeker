# TechSeeker: Production Deployment Status & Architecture Blueprint

**Current Status:** Ready for Production Deployment  
**Repository Architecture:** Turborepo / pnpm Monorepo  
**Stack:** Next.js 15 App Router (`apps/web`), FastAPI + SQLAlchemy 2.0 (`apps/api`), Isolated Sandboxed Runner (`apps/runner`)  

---

## 1. Deployment Architecture Summary

```
                       ┌─────────────────────────┐
                       │     End-User Browser    │
                       └────────────┬────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           │                                                 │
           ▼                                                 ▼
┌─────────────────────────┐                       ┌─────────────────────────┐
│       apps/web          │                       │        apps/api         │
│  (Next.js 15 Frontend)  │                       │   (FastAPI Backend)     │
│   Hosted on: VERCEL     │                       │    Hosted on: RENDER    │
│  (Edge CDN, SSR, RSC)   │                       │ (Web Service, Uvicorn)  │
└─────────────────────────┘                       └────────────┬────────────┘
                                                               │
                          ┌────────────────────────────────────┼────────────────────────────────────┐
                          ▼                                    ▼                                    ▼
              ┌────────────────────────┐           ┌────────────────────────┐           ┌────────────────────────┐
              │   Neon PostgreSQL 16   │           │      Upstash Redis     │           │      apps/runner       │
              │  - DATABASE_URL (Pool) │           │   - REDIS_URL          │           │ (Isolated Code Runner) │
              │  - DIRECT_URL (Direct) │           │   (rediss:// TLS)      │           │  Hosted on: RENDER     │
              │  (PgBouncer Safe)      │           │  (Low-latency cache)   │           │  (Private Service)     │
              └────────────────────────┘           └────────────────────────┘           └────────────────────────┘
```

---

## 2. Configuration & Reliability Hardening Complete

| Subsystem | Change Applied | Production Benefit |
| :--- | :--- | :--- |
| **Monorepo & Vercel** | Added `vercel.json`, `transpilePackages` in `apps/web/next.config.ts`, `turbo.json` env bindings | Fixes previous Vercel deployment failure by allowing isolated Next.js compilation of `@techseeker/ui` and `@techseeker/types`. |
| **Database & Neon** | Added `DIRECT_URL` support in `apps/api/app/core/config.py` and `apps/api/alembic/env.py` | Eliminates PgBouncer transaction-mode migration failures on Neon by directing Alembic migrations to unpooled connection while runtime uses connection pool. |
| **PostgreSQL Driver** | Added automatic URI scheme normalization (`postgres://` / `postgresql://` → `postgresql+psycopg://`) | Prevents SQLAlchemy 2.0 `NoSuchModuleError` when deploying against cloud database connection strings. |
| **Code Runner Sandbox** | Configured `render.yaml` with dedicated `pserv` (Private Service), non-root execution (`user: runner`, UID 10001), `prlimit` memory ceilings (128MB), 5s timeouts, 64KB bounded output | Isolates untrusted user code execution from the public internet and prevents noisy neighbor resource exhaustion on Render. |
| **CORS & Security** | Exact domain whitelist in `CORS_ORIGINS` (`https://techseeker.vercel.app`, `http://localhost:3000`), `Authorization` header passthrough | Eliminates security risks of open wildcards while supporting cross-origin JWT bearer authentication. |
| **CI/CD Automation** | Created `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` | Automatically executes linting, typechecking, frontend bundling, backend pytest suite, and deploys on push to `main`. |
| **Dockerfiles** | Multi-stage production Dockerfile with non-root `appuser` (UID 10001) for API and `runner` for Sandbox | Minimal attack surface, fast image caching, automated healthchecks. |

---

## 3. Production Secrets Manifest

| Variable Name | Target Platform | Description |
| :--- | :--- | :--- |
| `SECRET_KEY` | Render (`techseeker-api`) | 64-character random hex string for JWT signing (`openssl rand -hex 32`) |
| `DATABASE_URL` | Render (`techseeker-api`) | Neon pooled connection string (PgBouncer mode with `sslmode=require`) |
| `DIRECT_URL` | Render (`techseeker-api`) | Neon direct unpooled connection string (required for Alembic migrations) |
| `REDIS_URL` | Render (`techseeker-api`) | Upstash Redis connection URI (`rediss://default:...@host:6379`) |
| `GEMINI_API_KEYS` | Render (`techseeker-api`) | Comma-separated Gemini API keys for round-robin rotation |
| `GOOGLE_CLIENT_ID` | Render (`techseeker-api`) | Google Cloud OAuth 2.0 Client ID for backend token validation |
| `GOOGLE_CLIENT_SECRET` | Render (`techseeker-api`) | Google Cloud OAuth 2.0 Client Secret |
| `RUNNER_SERVICE_URL` | Render (`techseeker-api`) | Internal Private Service URL (`http://techseeker-runner:8001/execute`) |
| `CORS_ORIGINS` | Render (`techseeker-api`) | Exact comma-separated domains (e.g. `https://techseeker.vercel.app,http://localhost:3000`) |
| `ENVIRONMENT` | Render (`techseeker-api`) | Set to `production` |
| `NEXT_PUBLIC_API_URL` | Vercel (`apps/web`) | Public Render API URL (e.g. `https://techseeker-api.onrender.com`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Vercel (`apps/web`) | Google Cloud OAuth 2.0 Client ID for frontend button |
