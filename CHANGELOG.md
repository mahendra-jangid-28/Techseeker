# Changelog

All notable changes to the TechSeeker platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v0.1.0-alpha] - 2026-08-25

### Features & Capabilities

- **JWT Authentication & Security**
  - Secure registration, password hashing, and OAuth2 Bearer token authentication.
  - Multi-client token persistence and session validation.

- **AI Mentor with Persistent Memory**
  - Adaptive system prompt synthesis with multi-key Gemini fallback engine.
  - User memory persistence (`completed_topic`, `recent_learning_context`, `learning_preference`).

- **Weak-Topic Detection & Recovery**
  - State machine tracking learner struggle thresholds (`tracking` -> `active` -> `improving` -> `resolved`).
  - Deterministic recovery confidence calculation without permanent penalty.

- **Personalized Study Recommendations**
  - Multi-tier prioritized study recommendations engine (Priority #1: Weak-topic revision to Priority #5: Daily practice).
  - Dynamic recommendation refresh and dashboard card integration.

- **Roadmap & Progress Engine**
  - Career track learning pathways (AI/ML, Full Stack, Data Analysis, Mobile, DevOps, Cyber Security).
  - Interactive lesson delivery, progressive hint ladder, and automated quiz evaluation with XP progression.

- **Streaming AI Chat (SSE)**
  - Server-Sent Events (SSE) token-by-token streaming endpoint (`POST /chat/conversations/{id}/stream`).
  - Live typing bubble rendering in Next.js chat interface.

- **Regenerate Response**
  - In-place response regeneration (`POST /chat/messages/{id}/regenerate`) preserving message versioning and database integrity.

- **Python Sandbox Code Runner**
  - Sandboxed execution engine (`POST /playground/run`) with resource constraints (128MB RAM, 0.5 CPU, 2.0s timeout, read-only root, no network).
  - Temporary workspace isolation and performance metric tracking.

- **Monaco Interactive Playground UI**
  - VS Code–style interactive Python playground with syntax highlighting and auto-layout.
  - Collapsible standard input (STDIN), copy code, clear output, and dedicated STDOUT/STDERR tabs.
