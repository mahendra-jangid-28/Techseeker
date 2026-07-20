# Production REST API Architecture

> This document defines the production-ready API strategy, endpoint contracts, security model, and response standards for the platform. It is based on the approved architecture blueprint and database design.

---

## 1. API Architecture Strategy

### 1.1 API Versioning Strategy

Recommended approach: URI versioning with explicit major versions.

- Versioning format: /api/v1/...
- Major versions only when breaking changes occur.
- Minor improvements should remain backward compatible.
- Deprecation window: minimum 6 months for non-breaking changes and 12 months for breaking changes where possible.

Why:
- Frontend and backend teams can evolve independently.
- Stable contracts are essential for mobile, web, and third-party consumers.

### 1.2 REST Naming Conventions

General rules:
- Use nouns for resources.
- Use plural resource names.
- Use lowercase kebab-case in paths.
- Use hierarchical resource paths.
- Avoid verbs in URLs.

Examples:
- /api/v1/users
- /api/v1/users/{userId}/profile
- /api/v1/ai/knowledge-explorer
- /api/v1/admin/users

### 1.3 Resource Organization

The API should be grouped by domain:

- Authentication: /api/v1/auth
- Users: /api/v1/users
- AI: /api/v1/ai
- Learning: /api/v1/learning
- Files: /api/v1/files
- Notifications: /api/v1/notifications
- Admin: /api/v1/admin

### 1.4 Endpoint Grouping

Each group should expose:
- Collection endpoints: GET /resource, POST /resource
- Resource endpoints: GET /resource/{id}, PATCH /resource/{id}, DELETE /resource/{id}
- Sub-resource endpoints: /resource/{id}/subresource
- Action endpoints: POST /resource/{id}/actions/{actionName}

### 1.5 Authentication Flow

Recommended flow:
- User authenticates with email/password or SSO.
- API issues access token and refresh token.
- Access token is short-lived and sent in Authorization: Bearer.
- Refresh token is long-lived and stored securely.
- Refresh token rotation is recommended.

### 1.6 Authorization Strategy

Authorization must be enforced at the API layer.

Recommended model:
- Role-based access control for standard roles.
- Attribute-based access control for tenant, workspace, and project-level restrictions.
- Permission checks on every critical action.
- No client-side authorization trust.

### 1.7 API Lifecycle

Lifecycle stages:
- Draft
- Experimental
- Stable
- Deprecated
- Retired

Each endpoint should declare lifecycle status in documentation and monitoring.

### 1.8 API Deprecation Policy

- Mark endpoints deprecated in docs and response headers.
- Provide at least 90 days notice for breaking changes.
- Maintain old version for a minimum period.
- Log usage of deprecated routes.

### 1.9 Pagination Standard

Standard query parameters:
- page: integer, default 1
- pageSize: integer, default 20, max 100

Response envelope:
- data: array
- pagination: object with page, pageSize, totalItems, totalPages, hasNextPage

### 1.10 Filtering Standard

Use query parameters for filtering.

Examples:
- ?status=active
- ?tenantId=...
- ?createdAfter=...
- ?isRead=false

Filtering should be consistent across all resource collections.

### 1.11 Sorting Standard

Use query parameter:
- sort=field:direction

Example:
- ?sort=createdAt:desc

Only allow whitelisted sort fields.

### 1.12 Search Strategy

Use search for full-text or fuzzy search where useful.

Recommended behavior:
- /search endpoints for cross-resource search.
- Dedicated filtered search for large datasets.
- Search should be limited and paginated.

### 1.13 Idempotency Strategy

Required for write operations that may be retried.

Use:
- Idempotency-Key header for POST and PATCH operations.
- Server stores key for at least 24 hours.

This prevents duplicate payments, duplicate AI requests, and duplicate notification dispatches.

### 1.14 Rate Limiting Strategy

Apply rate limits at multiple levels:
- Global platform limits
- Tenant limits
- User limits
- Endpoint-specific limits
- AI provider usage limits

Recommended model:
- Token bucket or sliding window.
- Redis-backed distributed enforcement.

### 1.15 Response Standardization

All responses should follow a consistent envelope.

Recommended success shape:
{
  "success": true,
  "data": {},
  "meta": {}
}

Recommended error shape:
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more request fields are invalid.",
    "details": []
  }
}

---

## 2. Authentication APIs

### 2.1 Signup

- Purpose: Register a new user account.
- Method: POST
- URL: /api/v1/auth/signup
- Authentication Required: No
- Authorization Rules: Public
- Request Body:
  {
    "email": "user@example.com",
    "password": "StrongPassword123!",
    "fullName": "Jane Doe",
    "tenantSlug": "acme",
    "acceptTerms": true
  }
- Response Body:
  {
    "success": true,
    "data": {
      "user": {"id": "...", "email": "...", "status": "pending"},
      "requiresEmailVerification": true
    }
  }
- Validation Rules:
  - Email must be valid.
  - Password strength required.
  - Terms must be accepted.
- Success Responses:
  - 201 Created
- Error Responses:
  - 400 Validation Error
  - 409 Conflict if email already exists
- Status Codes:
  - 201, 400, 409, 429, 500

### 2.2 Login

- Purpose: Authenticate a user and issue tokens.
- Method: POST
- URL: /api/v1/auth/login
- Authentication Required: No
- Authorization Rules: Public
- Request Body:
  {
    "email": "user@example.com",
    "password": "StrongPassword123!"
  }
- Response Body:
  {
    "success": true,
    "data": {
      "accessToken": "...",
      "refreshToken": "...",
      "tokenType": "Bearer",
      "expiresIn": 900,
      "user": {}
    }
  }
- Validation Rules:
  - Email and password required.
- Success Responses:
  - 200 OK
- Error Responses:
  - 401 Unauthorized
  - 429 Too Many Requests
- Status Codes:
  - 200, 401, 429, 500

### 2.3 Logout

- Purpose: Revoke current session.
- Method: POST
- URL: /api/v1/auth/logout
- Authentication Required: Yes
- Authorization Rules: Authenticated user
- Request Body: None
- Response Body:
  {
    "success": true,
    "data": {
      "message": "Logged out successfully"
    }
  }
- Validation Rules:
  - Valid access token required.
- Success Responses:
  - 200 OK
- Error Responses:
  - 401 Unauthorized
- Status Codes:
  - 200, 401, 500

### 2.4 Refresh Token

- Purpose: Rotate refresh token and issue a new access token.
- Method: POST
- URL: /api/v1/auth/refresh
- Authentication Required: No
- Authorization Rules: Public with refresh token
- Request Body:
  {
    "refreshToken": "..."
  }
- Response Body:
  {
    "success": true,
    "data": {
      "accessToken": "...",
      "refreshToken": "...",
      "tokenType": "Bearer",
      "expiresIn": 900
    }
  }
- Validation Rules:
  - Refresh token must be valid and not revoked.
- Success Responses:
  - 200 OK
- Error Responses:
  - 401 Unauthorized
  - 403 Forbidden if revoked
- Status Codes:
  - 200, 401, 403, 429, 500

### 2.5 Forgot Password

- Purpose: Initiate password reset.
- Method: POST
- URL: /api/v1/auth/forgot-password
- Authentication Required: No
- Authorization Rules: Public
- Request Body:
  {
    "email": "user@example.com"
  }
- Response Body:
  {
    "success": true,
    "data": {
      "message": "If the account exists, a reset link has been sent"
    }
  }
- Validation Rules:
  - Must be a valid email.
- Success Responses:
  - 200 OK
- Error Responses:
  - 400 Validation Error
- Status Codes:
  - 200, 400, 429, 500

### 2.6 Reset Password

- Purpose: Reset password using token.
- Method: POST
- URL: /api/v1/auth/reset-password
- Authentication Required: No
- Authorization Rules: Public
- Request Body:
  {
    "token": "...",
    "newPassword": "StrongPassword123!"
  }
- Response Body:
  {
    "success": true,
    "data": {
      "message": "Password reset successfully"
    }
  }
- Validation Rules:
  - Token must be valid.
  - Password strength required.
- Success Responses:
  - 200 OK
- Error Responses:
  - 400 Validation Error
  - 401 Unauthorized
- Status Codes:
  - 200, 400, 401, 500

### 2.7 Verify Email

- Purpose: Verify email address using verification token.
- Method: POST
- URL: /api/v1/auth/verify-email
- Authentication Required: No
- Authorization Rules: Public
- Request Body:
  {
    "token": "..."
  }
- Response Body:
  {
    "success": true,
    "data": {
      "message": "Email verified successfully"
    }
  }
- Validation Rules:
  - Token must be valid.
- Success Responses:
  - 200 OK
- Error Responses:
  - 400 Validation Error
  - 401 Unauthorized
- Status Codes:
  - 200, 400, 401, 500

### 2.8 Change Password

- Purpose: Change password for authenticated user.
- Method: POST
- URL: /api/v1/auth/change-password
- Authentication Required: Yes
- Authorization Rules: Authenticated user
- Request Body:
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewPassword123!"
  }
- Response Body:
  {
    "success": true,
    "data": {
      "message": "Password changed successfully"
    }
  }
- Validation Rules:
  - Current password must match.
  - New password must meet policy.
- Success Responses:
  - 200 OK
- Error Responses:
  - 400 Validation Error
  - 401 Unauthorized
- Status Codes:
  - 200, 400, 401, 500

### 2.9 Multi-factor Authentication

- Purpose: Enable or verify MFA.
- Method: POST
- URL: /api/v1/auth/mfa/enable
- Authentication Required: Yes
- Authorization Rules: Authenticated user
- Request Body:
  {
    "totpSecret": "..."
  }
- Response Body:
  {
    "success": true,
    "data": {
      "secret": "...",
      "qrCodeUrl": "..."
    }
  }
- Validation Rules:
  - TOTP secret must be valid.
- Success Responses:
  - 200 OK
- Error Responses:
  - 400 Validation Error
- Status Codes:
  - 200, 400, 401, 500

### 2.10 Session Management

- Purpose: List or revoke active sessions.
- Method: GET /api/v1/auth/sessions
- Method: DELETE /api/v1/auth/sessions/{sessionId}
- Authentication Required: Yes
- Authorization Rules: Authenticated user
- Response Body:
  {
    "success": true,
    "data": [
      {
        "id": "...",
        "device": "Desktop",
        "ipAddress": "...",
        "createdAt": "...",
        "lastUsedAt": "..."
      }
    ]
  }

---

## 3. User APIs

### 3.1 Get Profile

- Purpose: Retrieve the user profile.
- Method: GET
- URL: /api/v1/users/me
- Authentication Required: Yes
- Authorization Rules: Authenticated user
- Response Body:
  {
    "success": true,
    "data": {
      "id": "...",
      "email": "...",
      "fullName": "...",
      "avatarUrl": "...",
      "preferences": {}
    }
  }

### 3.2 Update Profile

- Purpose: Update profile information.
- Method: PATCH
- URL: /api/v1/users/me
- Authentication Required: Yes
- Authorization Rules: Authenticated user
- Request Body:
  {
    "fullName": "Jane Doe",
    "timezone": "UTC"
  }

### 3.3 Avatar Upload

- Purpose: Upload or update avatar.
- Method: POST
- URL: /api/v1/users/me/avatar
- Authentication Required: Yes
- Authorization Rules: Authenticated user

### 3.4 Preferences

- Purpose: Retrieve or update notification and app preferences.
- Method: GET /api/v1/users/me/preferences
- Method: PATCH /api/v1/users/me/preferences

### 3.5 Notifications

- Purpose: Retrieve unread and archived notifications.
- Method: GET /api/v1/users/me/notifications
- Method: PATCH /api/v1/users/me/notifications/{notificationId}
- Method: POST /api/v1/users/me/notifications/read-all

### 3.6 Progress

- Purpose: Retrieve current progress and history.
- Method: GET /api/v1/users/me/progress
- Method: GET /api/v1/users/me/progress/{trackId}

### 3.7 Learning History

- Purpose: Retrieve completed learning activities.
- Method: GET /api/v1/users/me/learning-history

### 3.8 Achievements

- Purpose: Retrieve earned badges and achievements.
- Method: GET /api/v1/users/me/achievements

---

## 4. AI APIs

### 4.1 Knowledge Explorer

- Purpose: Explore knowledge content using AI.
- Method: POST
- URL: /api/v1/ai/knowledge-explorer
- Authentication Required: Yes
- Authorization Rules: Authenticated user with AI access
- Request Body:
  {
    "query": "Explain microservices architecture",
    "contextId": "...",
    "mode": "deep"
  }
- Response Body:
  {
    "success": true,
    "data": {
      "responseId": "...",
      "answer": "...",
      "sources": []
    }
  }

### 4.2 Programming Mentor

- Purpose: Provide programming guidance.
- Method: POST
- URL: /api/v1/ai/programming-mentor

### 4.3 Roadmap Generator

- Purpose: Generate a personalized learning roadmap.
- Method: POST
- URL: /api/v1/ai/roadmaps/generate

### 4.4 Quiz Generator

- Purpose: Generate quiz content based on topic or difficulty.
- Method: POST
- URL: /api/v1/ai/quizzes/generate

### 4.5 Assignment Solver

- Purpose: Help solve programming or learning assignment prompts.
- Method: POST
- URL: /api/v1/ai/assignments/solve

### 4.6 Code Review

- Purpose: Review code and provide actionable feedback.
- Method: POST
- URL: /api/v1/ai/code-review

### 4.7 Debug Assistant

- Purpose: Help debug an error or issue.
- Method: POST
- URL: /api/v1/ai/debug-assistant

### 4.8 Project Generator

- Purpose: Create a project plan or scaffold structure.
- Method: POST
- URL: /api/v1/ai/project-generator

### 4.9 Resume Analyzer

- Purpose: Analyze resume content and provide suggestions.
- Method: POST
- URL: /api/v1/ai/resume-analyzer

### 4.10 Interview Simulator

- Purpose: Simulate an interview conversation.
- Method: POST
- URL: /api/v1/ai/interview-simulator

### 4.11 AI Chat History

- Purpose: Retrieve chat history for the current user.
- Method: GET
- URL: /api/v1/ai/conversations

### 4.12 Conversation Management

- Purpose: Create, list, retrieve, update, or delete a conversation.
- Method: POST /api/v1/ai/conversations
- Method: GET /api/v1/ai/conversations/{conversationId}
- Method: PATCH /api/v1/ai/conversations/{conversationId}
- Method: DELETE /api/v1/ai/conversations/{conversationId}

### 4.13 Prompt Versioning

- Purpose: Manage prompt templates and versions.
- Method: GET /api/v1/ai/prompts
- Method: POST /api/v1/ai/prompts
- Method: GET /api/v1/ai/prompts/{promptId}
- Method: PATCH /api/v1/ai/prompts/{promptId}

### 4.14 AI Feedback

- Purpose: Submit feedback on AI response quality.
- Method: POST
- URL: /api/v1/ai/responses/{responseId}/feedback

### 4.15 AI Streaming Responses

- Purpose: Stream AI output as it is produced.
- Method: POST
- URL: /api/v1/ai/stream
- Authentication Required: Yes
- Authorization Rules: Authenticated user with AI access
- Response: text/event-stream

---

## 5. Learning APIs

### 5.1 Topics

- Purpose: Retrieve learning topics.
- Method: GET /api/v1/learning/topics
- Method: GET /api/v1/learning/topics/{topicId}

### 5.2 Courses

- Purpose: Retrieve learning courses.
- Method: GET /api/v1/learning/courses
- Method: GET /api/v1/learning/courses/{courseId}

### 5.3 Roadmaps

- Purpose: Retrieve roadmaps and roadmap items.
- Method: GET /api/v1/learning/roadmaps
- Method: GET /api/v1/learning/roadmaps/{roadmapId}

### 5.4 Bookmarks

- Purpose: Save and retrieve bookmarked content.
- Method: GET /api/v1/users/me/bookmarks
- Method: POST /api/v1/users/me/bookmarks
- Method: DELETE /api/v1/users/me/bookmarks/{bookmarkId}

### 5.5 Notes

- Purpose: Create and manage notes.
- Method: GET /api/v1/users/me/notes
- Method: POST /api/v1/users/me/notes
- Method: PATCH /api/v1/users/me/notes/{noteId}
- Method: DELETE /api/v1/users/me/notes/{noteId}

### 5.6 Practice

- Purpose: Retrieve practice exercises.
- Method: GET /api/v1/learning/practice

### 5.7 Coding Playground

- Purpose: Submit playground code for execution or evaluation.
- Method: POST /api/v1/learning/playground/execute

### 5.8 Progress Tracking

- Purpose: Track progress updates against learning items.
- Method: POST /api/v1/learning/progress
- Method: PATCH /api/v1/learning/progress/{progressId}

### 5.9 Certificates

- Purpose: Retrieve earned certificates.
- Method: GET /api/v1/users/me/certificates

---

## 6. Admin APIs

### 6.1 Dashboard

- Purpose: Retrieve admin dashboard metrics.
- Method: GET /api/v1/admin/dashboard
- Authentication Required: Yes
- Authorization Rules: Admin or support role

### 6.2 Users

- Purpose: List, create, update, or suspend users.
- Method: GET /api/v1/admin/users
- Method: PATCH /api/v1/admin/users/{userId}
- Method: DELETE /api/v1/admin/users/{userId}

### 6.3 Reports

- Purpose: Generate platform usage and performance reports.
- Method: GET /api/v1/admin/reports

### 6.4 AI Usage

- Purpose: View AI provider usage and cost.
- Method: GET /api/v1/admin/ai-usage

### 6.5 Analytics

- Purpose: View product analytics and usage trends.
- Method: GET /api/v1/admin/analytics

### 6.6 Moderation

- Purpose: Review and moderate content or user behavior.
- Method: GET /api/v1/admin/moderation
- Method: POST /api/v1/admin/moderation/actions

### 6.7 Content Management

- Purpose: Manage published content.
- Method: GET /api/v1/admin/content
- Method: PATCH /api/v1/admin/content/{contentId}

### 6.8 Announcements

- Purpose: Create and manage platform announcements.
- Method: GET /api/v1/admin/announcements
- Method: POST /api/v1/admin/announcements

### 6.9 API Keys

- Purpose: Manage internal or external API keys.
- Method: GET /api/v1/admin/api-keys
- Method: POST /api/v1/admin/api-keys

### 6.10 Feature Flags

- Purpose: Manage feature rollout flags.
- Method: GET /api/v1/admin/feature-flags
- Method: POST /api/v1/admin/feature-flags

---

## 7. File APIs

### 7.1 Upload

- Purpose: Upload a file.
- Method: POST
- URL: /api/v1/files/upload
- Authentication Required: Yes
- Authorization Rules: Authenticated user
- Request Body: multipart/form-data
- Response Body:
  {
    "success": true,
    "data": {
      "fileId": "...",
      "fileName": "...",
      "url": "..."
    }
  }

### 7.2 Download

- Purpose: Retrieve a signed download URL.
- Method: GET /api/v1/files/{fileId}/download

### 7.3 Delete

- Purpose: Delete a file.
- Method: DELETE /api/v1/files/{fileId}

### 7.4 Preview

- Purpose: Retrieve a temporary preview URL.
- Method: GET /api/v1/files/{fileId}/preview

### 7.5 Export

- Purpose: Export data or files.
- Method: POST /api/v1/files/export

### 7.6 Import

- Purpose: Import data or files.
- Method: POST /api/v1/files/import

---

## 8. Notification APIs

### 8.1 Email

- Purpose: Trigger or manage email notifications.
- Method: POST /api/v1/notifications/email
- Authentication Required: Yes
- Authorization Rules: Authenticated user or admin

### 8.2 Push

- Purpose: Send push notifications.
- Method: POST /api/v1/notifications/push

### 8.3 In-app Notifications

- Purpose: Retrieve and mark in-app notifications.
- Method: GET /api/v1/notifications
- Method: PATCH /api/v1/notifications/{notificationId}

### 8.4 Notification Preferences

- Purpose: Retrieve or update notification preferences.
- Method: GET /api/v1/users/me/notification-preferences
- Method: PATCH /api/v1/users/me/notification-preferences

---

## 9. Standard JSON Formats

### 9.1 Success Response

{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "...",
    "timestamp": "2026-07-18T00:00:00Z"
  }
}

### 9.2 Error Response

{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred.",
    "details": []
  },
  "meta": {
    "requestId": "..."
  }
}

### 9.3 Validation Error Response

{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed.",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}

### 9.4 Pagination Response

{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 120,
    "totalPages": 6,
    "hasNextPage": true
  }
}

### 9.5 AI Response Envelope

{
  "success": true,
  "data": {
    "responseId": "...",
    "answer": "...",
    "status": "completed",
    "model": "gemini-2.0",
    "provider": "gemini"
  },
  "meta": {
    "requestId": "...",
    "latencyMs": 1240
  }
}

### 9.6 Streaming Response

Content-Type: text/event-stream

```text
event: token
data: {"token":"Hello"}

event: done
data: {"done":true}
```

---

## 10. Security Model

### 10.1 JWT

- Access tokens: short-lived, e.g. 15 minutes.
- Refresh tokens: long-lived, rotated, stored securely.
- Tokens should be opaque or signed, depending on architecture.
- JWT claims should include tenantId, sub, role, and exp.

### 10.2 Refresh Tokens

- One refresh token per device/session.
- Rotation on every refresh.
- Revoke on logout or suspicious activity.

### 10.3 CSRF

- Apply CSRF protection for cookie-based auth.
- Use SameSite=strict/lax and CSRF tokens for browser-based sessions.

### 10.4 Rate Limiting

- Global and per-user limits.
- Apply stricter limits to auth and AI endpoints.
- Use Redis for distributed enforcement.

### 10.5 Input Validation

- Validate request bodies, headers, query params, and file metadata.
- Enforce size and content-type constraints.
- Reject malformed and overlong inputs.

### 10.6 OWASP Considerations

- Prevent SQL injection.
- Prevent XSS in output rendering.
- Prevent IDOR through strict authorization.
- Prevent mass assignment through allowlists.
- Prevent insecure direct object reference.

### 10.7 Request Signing

- Internal service-to-service calls should use signed requests.
- Use HMAC or mutual TLS where appropriate.

### 10.8 Replay Protection

- Use nonce or timestamp for signed APIs.
- Use idempotency keys for write endpoints.

---

## 11. API Documentation Standard

Each endpoint should include:

- Purpose
- Method
- URL
- Authentication Required
- Authorization Rules
- Request Body
- Response Body
- Validation Rules
- Success Responses
- Error Responses
- Status Codes

Documentation should be generated from an OpenAPI specification and published centrally.

---

## 12. Recommended OpenAPI Structure

The API should be documented in OpenAPI 3.1 with:

- tags by domain
- reusable schemas
- security schemes
- common response components
- examples for success and error
- versioned paths

---

## 13. Final API Design Principles

The platform API should be:

- Versioned
- Secure by default
- Tenant-aware
- Consistent across domains
- Observable and auditable
- Prepared for AI-driven features
- Ready for future mobile, web, and partner integrations

The two most important architectural decisions are:

1. Every endpoint should be tenant-aware and authorization-enforced.
2. AI endpoints should be treated as first-class, observable, and rate-limited platform capabilities, not simple proxy routes.
