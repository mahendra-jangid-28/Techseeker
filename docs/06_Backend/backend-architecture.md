# Production Backend Architecture

> This document defines the complete backend engineering architecture for the platform. It is based on the approved architecture blueprint, database design, and REST API documentation. It is implementation-ready at the architectural level and intentionally avoids code.

---

## 1. Backend Architecture Overview

The backend must be designed as a modular, multi-tenant, enterprise-grade SaaS platform with strong separation of concerns, explicit domain boundaries, asynchronous processing, and a provider-agnostic AI orchestration layer.

### 1.1 Architectural Style

Recommended approach:
- Modular monolith for initial implementation.
- Domain-driven module boundaries.
- Clear internal service contracts.
- Future-ready for extraction into services if the product scales beyond the initial growth phase.

This is the correct choice because:
- It reduces operational complexity early.
- It supports rapid delivery without premature distributed-system overhead.
- It preserves a clear path to decomposition later.

### 1.2 Core Backend Principles

The backend must follow these principles:
- Tenant-aware execution in every request path.
- Stateless application services wherever possible.
- All long-running work handled asynchronously.
- AI orchestration isolated from business logic.
- Strong validation, authorization, and observability.
- Explicit dependency inversion and interface-driven design.

### 1.3 High-Level Backend Architecture

The backend consists of five major layers:

1. API Layer
   - Handles HTTP requests.
   - Validates input.
   - Authenticates and authorizes requests.
   - Delegates to application services.

2. Application Layer
   - Implements business workflows.
   - Coordinates domain services.
   - Enforces business policies and permission checks.

3. Domain Layer
   - Contains domain modules such as authentication, users, learning, AI, quizzes, projects, files, notifications, and admin.
   - Encapsulates core business rules.

4. Infrastructure Layer
   - Database access.
   - Cache access.
   - Queue integration.
   - File storage.
   - External AI provider adapters.
   - Secrets and config services.

5. Observability and Operations Layer
   - Logging.
   - Metrics.
   - Tracing.
   - Health checks.
   - Audit events.

### 1.4 Domain Boundaries

The backend must be split into clear, bounded domains:

- Authentication
- Users and profile
- Learning and content
- Programming and coding workflows
- AI Manager
- Prompt management
- Quiz and assessments
- Roadmaps and projects
- Files
- Notifications
- Analytics
- Admin and operations
- Settings and feature flags
- Audit logs

These boundaries should be enforced by module ownership and explicit service contracts.

### 1.5 Request Lifecycle

A request should follow this path:

1. API route receives HTTP request.
2. Middleware validates headers, auth, rate limits, and correlation context.
3. Authentication middleware resolves identity and tenant context.
4. Authorization middleware checks permissions.
5. Request schema validation ensures input correctness.
6. Application service executes business flow.
7. Domain service or repository performs persistence and business logic.
8. Event emission and background job dispatch happen where necessary.
9. Response is formatted using a standard envelope.
10. Logs, metrics, traces, and audit events are emitted.

### 1.6 Dependency Flow

Dependencies should flow inward:
- API -> Service -> Domain -> Repository/Infrastructure
- The API layer should not know about database internals.
- Services should depend on abstractions, not specific implementations.
- Infrastructure concerns should be injected at the edges.

### 1.7 Internal Communication

Internal communication should be structured around:
- In-process service calls for local workflows.
- Event-driven messaging for asynchronous workflows.
- Queue-based tasks for long-running operations.
- Optional internal APIs for future service extraction.

### 1.8 Separation of Concerns

The backend must not mix concerns such as:
- HTTP handling with database access
- Authentication logic with AI orchestration
- Business rules with file storage logic
- Admin operations with user workflows

Each domain module should own its data and business rules.

### 1.9 Scalability Strategy

The backend must be designed for horizontal scaling from day one:
- Stateless application instances.
- Externalized session and cache state.
- Asynchronous workers for long-running tasks.
- Queue-based job processing.
- Database connection pooling.
- Read replicas for reporting and analytics if necessary.

---

## 2. FastAPI Project Structure

The backend should be implemented in a structured FastAPI application with clear ownership and explicit boundaries.

### 2.1 Recommended Folder Structure

```text
app/
  api/
    v1/
      auth/
      users/
      profile/
      learning/
      programming/
      ai/
      quizzes/
      roadmaps/
      projects/
      files/
      notifications/
      analytics/
      admin/
      settings/
      audit/
      health/
  core/
    auth/
    security/
    exceptions/
    logging/
    tracing/
    middleware/
    responses/
    pagination/
    enums/
    constants/
  config/
    settings.py
    env.py
    feature_flags.py
    secrets.py
  middleware/
    auth.py
    tenant.py
    rate_limit.py
    correlation.py
    error_handler.py
  dependencies/
    auth.py
    db.py
    cache.py
    queue.py
    storage.py
    ai.py
  models/
    base.py
    tenant.py
    user.py
    session.py
    role.py
    permission.py
    workspace.py
    project.py
    progress.py
    quiz.py
    roadmap.py
    file.py
    notification.py
    ai_request.py
    ai_response.py
    prompt_template.py
    audit_event.py
    analytics_event.py
    feature_flag.py
  schemas/
    auth/
    users/
    profile/
    learning/
    programming/
    ai/
    quizzes/
    roadmaps/
    projects/
    files/
    notifications/
    analytics/
    admin/
    common/
  repositories/
    base.py
    tenant_repository.py
    user_repository.py
    progress_repository.py
    quiz_repository.py
    roadmap_repository.py
    file_repository.py
    notification_repository.py
    ai_repository.py
    audit_repository.py
    analytics_repository.py
  services/
    auth_service.py
    user_service.py
    profile_service.py
    learning_service.py
    programming_service.py
    ai_manager.py
    prompt_service.py
    quiz_service.py
    roadmap_service.py
    project_service.py
    file_service.py
    notification_service.py
    analytics_service.py
    admin_service.py
    settings_service.py
    audit_service.py
    feature_flag_service.py
  workers/
    worker.py
    ai_worker.py
    notification_worker.py
    file_worker.py
    analytics_worker.py
    scheduler.py
  events/
    domain_events.py
    handlers/
  tasks/
    celery_tasks.py
    async_tasks.py
  utils/
    ids.py
    slug.py
    hashing.py
    time.py
    pagination.py
    strings.py
    redaction.py
  tests/
    unit/
    integration/
    api/
    performance/
  docs/
    api/
    architecture/
    runbooks/
```

### 2.2 Folder Responsibilities

#### app/api
Responsible for HTTP transport, route registration, request parsing, response formatting, and endpoint documentation.

#### app/api/v1
Versioned API namespace. Each domain should have its own router module.

#### app/core
Foundation services for auth, security, middleware, exceptions, logging, tracing, pagination, and shared constants.

#### app/config
Centralized configuration handling for environment variables, secrets, settings, feature flags, and runtime behavior.

#### app/middleware
Cross-cutting middleware for authentication, tenant resolution, rate limiting, correlation IDs, CORS, and error handling.

#### app/dependencies
Dependency injection providers for database sessions, cache, queue, AI clients, storage clients, and auth context.

#### app/models
Persistent database entities and ORM mappings. These should be reflective of the approved database design.

#### app/schemas
Request and response DTO schemas. Should be separated by domain for maintainability.

#### app/repositories
Persistence access layer. Responsible for database operations only.

#### app/services
Business logic layer. Should orchestrate repositories and external services.

#### app/workers
Background job executors for long-running or asynchronous tasks.

#### app/events
Domain event definitions and event handlers.

#### app/tasks
Task entry points for scheduling and distributed execution.

#### app/utils
Reusable helper functions and cross-cutting utilities.

#### app/tests
Validation coverage for unit, integration, API, and performance tests.

#### app/docs
Implementation docs, onboarding notes, runbooks, and API docs assets.

---

## 3. Domain Modules

### 3.1 Authentication Module

Responsibilities:
- Sign up, login, logout, refresh token handling.
- Password reset and email verification.
- MFA flow orchestration.
- Session lifecycle management.
- Token issuance and revocation.

Key services:
- AuthService
- SessionService
- PasswordService
- MFAService
- TokenService

Key dependencies:
- UserRepository
- SessionRepository
- SecretsManager
- EmailProvider

### 3.2 Users Module

Responsibilities:
- User profile lifecycle.
- Account status management.
- Relationship to tenant and memberships.
- User search and administration.

Key services:
- UserService
- MembershipService
- ProfileService

### 3.3 Profile Module

Responsibilities:
- User profile data.
- Preferences and settings.
- Avatar and profile image workflows.
- Locale and timezone handling.

### 3.4 Learning Module

Responsibilities:
- Topics, courses, roadmaps, bookmarks, notes, certificates.
- Learning history and progress synchronization.
- Learning content retrieval and user interaction tracking.

### 3.5 Programming Module

Responsibilities:
- Programming challenge management.
- Code playground execution support.
- Practice exercises and related evaluation workflows.

### 3.6 AI Manager Module

Responsibilities:
- Provider abstraction.
- Routing and fallback.
- Prompt execution.
- Token accounting.
- Cost tracking.
- Conversation management.
- Streaming support.

### 3.7 Prompt Management Module

Responsibilities:
- Prompt template versioning.
- Prompt retrieval and activation.
- Prompt variable handling.
- Prompt audit history.

### 3.8 Quiz Module

Responsibilities:
- Quiz creation, modification, and execution.
- Question and option management.
- Attempt tracking and scoring.
- Review and analytics generation.

### 3.9 Roadmaps Module

Responsibilities:
- Roadmap item creation and updates.
- Status progression.
- Timeline and milestone logic.
- Roadmap analytics.

### 3.10 Projects Module

Responsibilities:
- Project creation and workspace association.
- Project lifecycle states.
- Project metadata and collaboration state.

### 3.11 Files Module

Responsibilities:
- File metadata and storage orchestration.
- Upload and download flows.
- File versioning.
- File access control.
- Cleanup and retention policy enforcement.

### 3.12 Notifications Module

Responsibilities:
- In-app notifications.
- Email and push notification dispatch.
- Preference management.
- Delivery tracking.

### 3.13 Analytics Module

Responsibilities:
- Usage collection.
- Aggregated reporting.
- AI usage analytics.
- Product telemetry.

### 3.14 Admin Module

Responsibilities:
- Dashboard metrics.
- User moderation.
- Report generation.
- AI usage inspection.
- Feature flag management.
- System announcement management.

### 3.15 Settings Module

Responsibilities:
- Tenant settings.
- Feature configurations.
- Provider settings.
- Notification defaults.

### 3.16 Audit Logs Module

Responsibilities:
- Append-only audit event capture.
- Security and admin event logging.
- Review and export.

### 3.17 Feature Flags Module

Responsibilities:
- Runtime feature rollout.
- Tenant-specific and role-specific flag control.
- Safe enablement and rollback.

---

## 4. Business Logic Layer Design

### 4.1 Service Layer

The service layer should own business workflows and orchestrate repositories and external services.

Responsibilities:
- Validate business rules.
- Coordinate domain actions.
- Call repositories for persistence.
- Emit domain events.
- Manage transactions when necessary.

Service design principle:
- Services should not directly implement transport concerns.
- Services should not directly parse HTTP requests.

### 4.2 Repository Layer

The repository layer should encapsulate persistence logic.

Responsibilities:
- Query and write data.
- Abstract the ORM and database access details.
- Implement query composition and filtering.
- Avoid leaking persistence specifics to services.

Repository boundary principles:
- Repositories should be data-access focused, not business-rule focused.
- They should expose domain-meaningful methods.

### 4.3 Validation Layer

The validation layer should enforce:
- Request schema correctness.
- Business-rule validation.
- Domain invariants.
- Cross-field consistency.

Validation should happen at the API edge and again in service layer for safety.

### 4.4 DTO Layer

DTOs should be split between:
- Request DTOs: incoming input.
- Response DTOs: outgoing API payloads.
- Internal DTOs: service-to-service communication.

This prevents internal models from leaking to public contracts.

### 4.5 Mapper Layer

Mappers should translate between:
- ORM models and domain objects
- Domain objects and DTOs
- Repository results and service objects

This keeps domain models decoupled from persistence and API concerns.

### 4.6 Policy Layer

Policies should implement authorization and business rules such as:
- Can this user access this tenant resource?
- Can this user trigger AI operations under their plan?
- Is this action allowed in current state?

Policies should be separate from services to keep rules explicit and testable.

### 4.7 Permission Layer

Permissions should be enforced by domain policy modules.

Required concepts:
- Permission checks for read/write/admin actions.
- Scope evaluation for tenant/workspace/project ownership.
- Plan-based gating for premium capabilities.

### 4.8 Exception Layer

Exceptions should be domain-specific and structured.

Examples:
- ValidationError
- AuthorizationError
- NotFoundError
- ConflictError
- RateLimitError
- AIProviderError
- ExternalDependencyError

The exception layer should map to consistent API error responses.

---

## 5. AI Manager Architecture

The AI Manager must be treated as a first-class backend subsystem.

### 5.1 Design Goals

The AI Manager must provide:
- Provider abstraction
- Resilience and failover
- Observability
- Cost control
- Prompt lifecycle management
- Safe output handling
- Streaming support

### 5.2 Provider Interface

The AI Manager should expose a provider interface with the following capabilities:
- generate
- stream
- health_check
- estimate_cost
- supports_streaming
- supports_tools

Each provider adapter implements the same interface.

### 5.3 Gemini Adapter

Responsibilities:
- Route requests to Gemini.
- Map generic request to provider-specific payloads.
- Handle provider-specific errors.
- Measure latency and token counts.

### 5.4 OpenAI Adapter

Responsibilities:
- Implement OpenAI-compatible request/response behavior.
- Maintain provider-specific model mapping.
- Track token and cost metadata.

### 5.5 Claude Adapter

Responsibilities:
- Support Claude request semantics.
- Enforce provider-specific limits.
- Normalize outputs for downstream consumers.

### 5.6 Groq Adapter

Responsibilities:
- Handle high-throughput low-latency routing.
- Maintain provider-specific error treatment.
- Support streaming and cost metadata tracking.

### 5.7 Provider Selection

Provider selection should be policy-driven:
- Cost-sensitive tasks choose the cheapest provider that meets requirements.
- Latency-sensitive tasks choose the fastest available provider.
- High-reliability tasks can fan out to multiple providers.

Selection logic should be centralized in the AI Manager rather than spread across API handlers.

### 5.8 Provider Health

Health checks must be performed for:
- API reachability
- Authentication validity
- Model availability
- Latency thresholds
- Error-rate thresholds

A provider should be temporarily marked unhealthy if failure thresholds are exceeded.

### 5.9 Retry Strategy

Use exponential backoff with jitter for transient provider failures.

Rules:
- Retry only on transient errors.
- Respect provider-specific rate limits.
- Avoid infinite retry loops.
- Track retry attempts in the request record.

### 5.10 Fallback Logic

Fallback should occur only when safe and policy-compliant.

Examples:
- If Gemini is unavailable, route to OpenAI.
- If a model is rate-limited, use a secondary model.
- If an AI response is invalid, reattempt with a safer prompt template.

### 5.11 Streaming

Streaming should be supported where the provider permits it.

Requirements:
- Stream tokens to the client incrementally.
- Maintain request lifecycle state.
- Support cancellation and timeout.
- Emit progress metrics.

### 5.12 Token Tracking

Every request must record:
- Prompt tokens
- Completion tokens
- Total tokens
- Model name
- Provider name
- Tenant and user context

Token tracking should be stored in the database and used for quotas and billing.

### 5.13 Cost Tracking

The backend must track:
- Provider cost per request
- Cost per model
- Cost per tenant
- Cost by feature and user

Costs should be persisted even if a request fails after provider interaction.

### 5.14 API Key Rotation

The backend should support:
- Multiple API keys per provider
- Health-based key selection
- Rotation without downtime
- Secret versioning
- Key usage tracking

### 5.15 Prompt Versioning

Prompt templates must be versioned.

Rules:
- Each prompt template must have a version number.
- Prompt changes should be auditable.
- The prompt used for a request should be stored with the request record.

### 5.16 Caching

Caching must be applied carefully.

Recommended cache targets:
- Repeated prompt templates
- Frequently requested static content
- Short-lived AI responses where deterministic and safe
- Provider health status

Do not cache sensitive or non-deterministic content by default.

### 5.17 Output Validation

The backend must validate AI outputs before returning them to the client.

Validation should include:
- Schema validation where expected output structure is known
- Safety checks
- Content filtering where applicable
- Redaction of sensitive values

---

## 6. Background Worker Architecture

Background workers are mandatory for production readiness.

### 6.1 Queue System

Recommended queueing model:
- Durable queue for jobs.
- Redis-backed or broker-backed queue.
- Job payloads should be idempotent and serializable.

### 6.2 Retries

Jobs must support:
- Retry attempts
- Exponential backoff
- Dead-letter handling
- Per-job timeout limits

### 6.3 Dead Letter Queue

Failed jobs beyond retry threshold should be routed to a dead-letter queue for investigation.

### 6.4 Scheduling

Use scheduled tasks for:
- Cleanup jobs
- Analytics aggregation
- Expiring sessions
- Notification dispatch retries
- Token usage rollups

### 6.5 Long-Running Jobs

Examples:
- Large AI generation jobs
- Batch imports
- File processing pipelines
- Report generation

These should be asynchronous and tracked via job state.

### 6.6 Notifications

Notifications should be sent by workers so that user-facing actions do not slow down the request path.

### 6.7 AI Processing

All AI requests that are not strictly synchronous should be queued and processed by workers.

### 6.8 File Processing

File processing tasks should include:
- Virus scan or content policy checks
- Thumbnail generation
- Metadata extraction
- Storage cleanup and archival

---

## 7. Security Architecture

### 7.1 Authentication

Authentication should be centralized and standards-based.

Recommended approach:
- OIDC-compatible auth flows where possible.
- Session-based or token-based authentication depending on frontend architecture.
- Short-lived access tokens and refresh-token rotation.

### 7.2 Authorization

Authorization should be policy-based and explicit.

Requirements:
- Role-based access control for standard user/admin patterns.
- Attribute-based checks for tenant/workspace/project ownership.
- Permission checks on every sensitive action.

### 7.3 RBAC

Role model should include:
- Super admin
- Tenant admin
- Editor
- Viewer
- Support user
- Service account

Role membership should be stored and evaluated from the database.

### 7.4 JWT

Access tokens should be short-lived and carry minimal claims.

Claims should include:
- sub
- tenantId
- role
- scopes
- exp
- iat

### 7.5 Refresh Tokens

Refresh tokens should:
- Be rotated
- Be revocable
- Be stored securely
- Be invalidated on suspicious behavior

### 7.6 Input Validation

Validation should occur in multiple layers:
- API schema validation
- Service-level business validation
- Repository-level invariants where necessary

Validation must reject invalid types, missing fields, oversized payloads, and malicious input.

### 7.7 Rate Limiting

Apply per:
- IP
- User
- Tenant
- Route/endpoint
- AI operation type

Rate limiting must be enforced consistently and centrally.

### 7.8 Encryption

Encryption requirements:
- TLS for all network communication
- Encryption at rest for sensitive data
- Encryption of secrets in the secrets manager
- Hashing of passwords with a strong password hashing algorithm

### 7.9 Secrets

Secrets must not be embedded in code or environment files except where runtime injection is required.

Use a dedicated secrets manager.

### 7.10 Prompt Injection Protection

The backend must protect against prompt injection and unsafe AI behavior.

Controls:
- Input sanitization and redaction
- Prompt template boundaries
- User content isolation
- Output validation
- Human review for high-impact AI workflows

---

## 8. Error Handling Architecture

The backend should implement global exception handling with structured errors.

### 8.1 Validation Errors

Examples:
- Missing required fields
- Invalid email format
- Password too weak
- Unsupported file type

Response shape:
- 400 Bad Request with validation details.

### 8.2 Business Errors

Examples:
- User not allowed to access a resource
- Invalid workflow state transition
- Duplicate entity

Response shape:
- 409 Conflict or 403 Forbidden depending on cause.

### 8.3 AI Errors

Examples:
- Provider unavailable
- Model not found
- Token limit exceeded
- Prompt blocked

Response shape:
- 502 Bad Gateway or 424 Failed Dependency where appropriate.

### 8.4 Database Errors

Examples:
- Connection issues
- Lock timeout
- Constraint violations

Response shape:
- 500 Internal Server Error for generic cases, 409/422 for known constraint issues.

### 8.5 Timeouts

Long-running requests must be handled gracefully.

Strategy:
- Short timeout for sync operations.
- Async processing for long-running tasks.
- Retry with clear user-visible status.

### 8.6 Rate Limits

Response shape:
- 429 Too Many Requests with retry-after metadata.

### 8.7 Provider Failures

Provider outage handling should be explicit and resilient.

Strategy:
- Retry.
- Fallback.
- User-friendly surfaced error state.
- Audit and metrics logging.

---

## 9. Logging and Monitoring Architecture

### 9.1 Structured Logging

Logs must be structured, searchable, and tenant-aware.

Each log entry should include:
- request_id
- correlation_id
- tenant_id
- user_id
- operation name
- duration_ms
- status
- error_code

### 9.2 Tracing

Distributed tracing should be enabled for:
- API request flow
- AI request lifecycle
- Worker execution
- Database access

Tracing must provide end-to-end visibility across the system.

### 9.3 Metrics

Collect metrics for:
- Request count
- Latency
- Error rate
- Provider usage
- Token consumption
- Queue depth
- Worker health
- Cache hit rate

### 9.4 Health Checks

Provide health endpoints for:
- App readiness
- Liveness
- Dependency checks for DB, Redis, queue, storage, and providers

### 9.5 Audit Logs

Capture auditable events for:
- Authentication and session changes
- User profile updates
- Admin actions
- AI request lifecycle changes
- File access and deletion
- Notification dispatches

### 9.6 Performance Monitoring

Track slow endpoints, slow queries, queue delays, and AI provider latency.

---

## 10. Configuration Architecture

### 10.1 Environment Variables

Configuration must be environment-based and clearly segregated.

Examples:
- APP_ENV
- DATABASE_URL
- REDIS_URL
- SECRET_KEY
- AI_PROVIDER_KEYS
- STORAGE_BUCKET
- FEATURE_FLAGS

### 10.2 Secrets

Secrets must be loaded from a secrets management service and not stored directly in source code or config files.

### 10.3 Settings

Use a centralized settings module that exposes typed configuration values.

Settings should include:
- API host and port
- DB connections
- Redis settings
- Authentication settings
- AI provider configuration
- File storage settings
- Queue settings
- Retry limits
- Feature flags

### 10.4 Feature Flags

Feature flags should be runtime-configurable and environment-aware.

Examples:
- ai.enabled
- new_signup_flow.enabled
- roadmap_generator.enabled
- experimental_chat_stream.enabled

### 10.5 Development, Testing, and Production

Each environment must have:
- Separate secrets
- Different resource limits
- Distinct feature flags
- Isolated databases and queues

---

## 11. Testing Strategy

### 11.1 Unit Tests

Unit tests should cover:
- Service methods
- Policy evaluation
- Validation logic
- Mapper logic
- Repository query behavior where isolated

### 11.2 Integration Tests

Integration tests should cover:
- Repository/database interactions
- Cache integration
- Queue interactions
- File storage interaction

### 11.3 API Tests

API tests should validate:
- Status codes
- Response envelope
- Authorization behavior
- Validation behavior
- Error handling

### 11.4 AI Tests

AI tests should validate:
- Provider adapter behavior
- Retry and fallback logic
- Quota enforcement
- Prompt template usage
- Output validation behavior

### 11.5 Performance Tests

Performance tests should cover:
- API latency under load
- Database throughput under concurrent access
- Worker throughput under queue pressure
- AI request burst tolerance

---

## 12. Development Guidelines

### 12.1 Naming Conventions

- Use clear domain-based names.
- Use snake_case for modules and files.
- Use PascalCase for classes.
- Use UPPER_SNAKE_CASE for constants.
- Avoid ambiguous names like manager, helper, util where domain-specific alternatives exist.

### 12.2 Folder Conventions

- Domain modules should be grouped by business capability.
- Infrastructure concerns should stay under infrastructure-specific packages.
- Shared utilities should be minimal and explicit.

### 12.3 Dependency Rules

Rules:
- API layer depends on services.
- Services depend on repositories, policies, and infrastructure abstractions.
- Repositories do not depend on API layer concerns.
- Domain logic should not depend on HTTP transport.
- Infrastructure code must be injectable and replaceable.

### 12.4 Code Organization

The application should be organized around:
- Domain modules
- Reusable cross-cutting concerns
- Explicit service contracts
- Clear persistence boundaries

### 12.5 Error Handling Standards

- Use typed exceptions.
- Avoid swallowing failures silently.
- Always log unexpected exceptions.
- Map exceptions to structured API responses.

### 12.6 Documentation Standards

Every module should have:
- Purpose statement
- Public contract
- Dependencies
- Failure modes
- Example usage where appropriate

### 12.7 Review Checklist

A backend review should verify:
- Tenant awareness
- Authorization correctness
- Input validation
- Error handling
- Logging and metrics
- Test coverage
- Performance and scalability readiness
- Security posture

---

## 13. Implementation Priorities

### Phase 1: Foundations
- Auth and tenant context
- Database access layer
- Configuration and secrets
- Logging and exception handling
- Basic API routing

### Phase 2: Core Domain Modules
- Users, profile, learning, projects, quizzes, roadmaps
- Service and repository layers
- Basic policies and permissions

### Phase 3: AI Platform Layer
- AI Manager
- Provider adapters
- Prompt management
- Token and cost tracking
- Streaming and fallback

### Phase 4: Async and Operations
- Worker system
- Notifications
- File processing
- Analytics pipeline

### Phase 5: Admin and Enterprise Hardening
- Admin APIs
- Audit logs
- Feature flags
- Security hardening
- Operational tooling

---

## 14. Final Backend Architectural Verdict

The backend should be implemented as a modular monolith with strong domain boundaries, explicit service contracts, asynchronous worker support, and a provider-agnostic AI architecture. The key architectural success factors are:

1. Clear tenant and authorization enforcement.
2. Strong separation between API, service, domain, and infrastructure concerns.
3. AI orchestration isolated behind a dedicated subsystem.
4. Background processing for all expensive and non-blocking operations.
5. Production-grade observability, security, and testing from the first milestone.

This design is suitable for a platform expected to grow into a high-scale SaaS product while remaining maintainable and operationally sane.
