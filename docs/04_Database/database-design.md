# Production PostgreSQL Database Design

> This document is the production database architecture baseline for the approved architecture blueprint. It is intentionally opinionated, enterprise-grade, and designed for long-term SaaS operation.

---

## 1. Design Objectives

The database must support:

- Multi-tenant SaaS operation with strong tenant isolation.
- High-concurrency transactional workloads.
- AI request orchestration with auditable provider usage.
- User progress tracking, quizzes, and roadmap workflows.
- Large-scale file and notification operations.
- Strong auditability, retention policy, and operational observability.

The database should be treated as the system of record, not as a convenience store for application state.

---

## 2. Core Design Principles

1. Tenant-first data modeling
   - Every tenant-scoped table must include tenant_id.
   - Every cross-tenant query must be explicitly scoped.

2. Immutable auditability
   - Core business records must be auditable.
   - Sensitive operations must be logged in append-only tables.

3. Soft delete over hard delete for business integrity
   - Use deleted_at and deleted_by for non-destructive deletion.

4. Normalize transactional data
   - Keep core entities normalized.
   - Use JSONB only for flexible metadata and provider response payloads.

5. Denormalize only where operationally necessary
   - Analytics and reporting tables can be denormalized for speed.

6. Partition large append-heavy tables
   - AI request and event tables should be partitioned by time.

---

## 3. Data Model Conventions

- Primary keys: uuid for distributed-safe identity and easier replication.
- Timestamps: timestamptz for all time-based fields.
- Counters and totals: bigint for usage and token accounting.
- Flexible metadata: jsonb.
- Text fields: varchar with explicit length limits where possible.
- Soft delete: deleted_at timestamptz null.
- Status fields: varchar(30) with constrained values.
- Audit fields: created_at, created_by, updated_at, updated_by.

---

## 4. Entity Catalog

The database contains the following major domains:

- Identity and access control
- Tenant and workspace management
- Product content and workflow management
- Progress and assessment systems
- AI orchestration and usage tracking
- File management
- Notifications and admin operations
- Audit and analytics

---

## 5. Identity and Access Control

### 5.1 tenants
Purpose: Represents a customer, organization, or business account.

Columns:
- id uuid PK
- slug varchar(100) unique not null
- name varchar(255) not null
- status varchar(30) not null
- plan_code varchar(50) not null
- region varchar(100) not null
- timezone varchar(100) not null default 'UTC'
- settings jsonb not null default '{}'::jsonb
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- Unique: slug
- Check: status in ('active','suspended','trial','cancelled','deleting')

Indexes:
- idx_tenants_status
- idx_tenants_created_at
- idx_tenants_deleted_at

Relationships:
- One tenant has many users, workspaces, projects, quizzes, files, notifications, and AI records.

Normalization decision:
- Tenant is a top-level aggregate and should remain separate from users to preserve a clean multi-tenant model.

---

### 5.2 users
Purpose: Represents a human account that authenticates into the platform.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- email varchar(255) unique not null
- username varchar(100) null
- first_name varchar(100) null
- last_name varchar(100) null
- avatar_url varchar(500) null
- password_hash varchar(255) null
- is_email_verified boolean not null default false
- is_mfa_enabled boolean not null default false
- locale varchar(20) not null default 'en'
- timezone varchar(100) not null default 'UTC'
- status varchar(30) not null
- last_login_at timestamptz null
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- Unique: email per tenant context; in practice enforce with partial unique constraint on tenant_id and email where deleted_at is null
- Check: status in ('active','disabled','pending','suspended','deleted')

Indexes:
- idx_users_tenant_id
- idx_users_email
- idx_users_status
- idx_users_last_login_at
- idx_users_deleted_at

Relationships:
- Many users belong to one tenant.
- One user may have many memberships, sessions, progress records, quiz attempts, and notifications.

Normalization decision:
- User identity remains separate from tenant identity, which is essential for future SSO and external identity integration.

---

### 5.3 user_sessions
Purpose: Stores active or historical authentication sessions.

Columns:
- id uuid PK
- user_id uuid not null FK -> users.id
- session_token_hash varchar(255) not null
- refresh_token_hash varchar(255) null
- ip_address inet null
- user_agent text null
- expires_at timestamptz not null
- revoked_at timestamptz null
- created_at timestamptz not null

Constraints:
- PK: id
- FK: user_id -> users.id

Indexes:
- idx_user_sessions_user_id
- idx_user_sessions_expires_at
- idx_user_sessions_revoked_at

Relationships:
- One user has many sessions.

---

### 5.4 roles
Purpose: Defines a reusable role definition.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- name varchar(100) not null
- description text null
- is_system boolean not null default false
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- Unique: tenant_id + name where deleted_at is null

Indexes:
- idx_roles_tenant_id
- idx_roles_name

---

### 5.5 permissions
Purpose: Defines the granular permission catalog.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- code varchar(100) not null
- description text null
- created_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- Unique: tenant_id + code

---

### 5.6 role_permissions
Purpose: Joins roles to permissions.

Columns:
- role_id uuid PK/FK -> roles.id
- permission_id uuid PK/FK -> permissions.id
- created_at timestamptz not null

Constraints:
- PK: role_id, permission_id

---

### 5.7 tenant_memberships
Purpose: Associates users with tenant roles and optional workspace-specific roles.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- user_id uuid not null FK -> users.id
- role_id uuid null FK -> roles.id
- invitation_status varchar(30) not null default 'accepted'
- invited_by uuid null FK -> users.id
- joined_at timestamptz null
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: user_id -> users.id
- FK: role_id -> roles.id
- Unique: tenant_id + user_id

Indexes:
- idx_tenant_memberships_user_id
- idx_tenant_memberships_role_id
- idx_tenant_memberships_invitation_status

---

## 6. Workspace and Product Structure

### 6.1 workspaces
Purpose: A workspace is the user-facing container for project content.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- name varchar(255) not null
- slug varchar(150) not null
- description text null
- status varchar(30) not null default 'active'
- owner_user_id uuid not null FK -> users.id
- settings jsonb not null default '{}'::jsonb
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: owner_user_id -> users.id
- Unique: tenant_id + slug where deleted_at is null

Indexes:
- idx_workspaces_tenant_id
- idx_workspaces_owner_user_id
- idx_workspaces_status

---

### 6.2 projects
Purpose: Represents a project or learning cohort within a workspace.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- workspace_id uuid not null FK -> workspaces.id
- name varchar(255) not null
- description text null
- status varchar(30) not null default 'active'
- created_by uuid not null FK -> users.id
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: workspace_id -> workspaces.id
- FK: created_by -> users.id
- Unique: workspace_id + name where deleted_at is null

Indexes:
- idx_projects_workspace_id
- idx_projects_status
- idx_projects_created_by

---

## 7. Progress Tracking

### 7.1 progress_tracks
Purpose: A top-level progression collection such as a course, path, or milestone track.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- project_id uuid null FK -> projects.id
- title varchar(255) not null
- description text null
- status varchar(30) not null default 'draft'
- sort_order integer not null default 0
- metadata jsonb not null default '{}'::jsonb
- created_by uuid not null FK -> users.id
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: project_id -> projects.id
- FK: created_by -> users.id

Indexes:
- idx_progress_tracks_tenant_id
- idx_progress_tracks_project_id
- idx_progress_tracks_status

---

### 7.2 progress_track_items
Purpose: Individual steps, checkpoints, or tasks within a progress track.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- track_id uuid not null FK -> progress_tracks.id
- title varchar(255) not null
- item_type varchar(50) not null
- external_ref varchar(500) null
- expected_duration_minutes integer null
- sort_order integer not null default 0
- metadata jsonb not null default '{}'::jsonb
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: track_id -> progress_tracks.id

Indexes:
- idx_progress_track_items_track_id
- idx_progress_track_items_item_type
- idx_progress_track_items_sort_order

---

### 7.3 user_progress
Purpose: Captures each user’s current progress against a track item.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- user_id uuid not null FK -> users.id
- track_id uuid null FK -> progress_tracks.id
- track_item_id uuid null FK -> progress_track_items.id
- status varchar(30) not null default 'not_started'
- completion_percent integer not null default 0
- started_at timestamptz null
- completed_at timestamptz null
- last_activity_at timestamptz null
- metadata jsonb not null default '{}'::jsonb
- created_at timestamptz not null
- updated_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: user_id -> users.id
- FK: track_id -> progress_tracks.id
- FK: track_item_id -> progress_track_items.id
- Unique: user_id + track_item_id

Indexes:
- idx_user_progress_user_id
- idx_user_progress_status
- idx_user_progress_completed_at
- idx_user_progress_last_activity_at

---

### 7.4 progress_events
Purpose: Append-only event history for progress changes.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- user_id uuid not null FK -> users.id
- progress_id uuid not null FK -> user_progress.id
- event_type varchar(50) not null
- event_payload jsonb not null default '{}'::jsonb
- created_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: user_id -> users.id
- FK: progress_id -> user_progress.id

Indexes:
- idx_progress_events_progress_id
- idx_progress_events_created_at
- idx_progress_events_event_type

Normalization decision:
- Progress events are stored separately from current progress state to preserve auditability and avoid expensive update churn on the primary progress table.

---

## 8. Quiz System

### 8.1 quizzes
Purpose: Defines a quiz or assessment unit.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- project_id uuid null FK -> projects.id
- title varchar(255) not null
- description text null
- status varchar(30) not null default 'draft'
- time_limit_minutes integer null
- pass_mark integer not null default 70
- shuffle_questions boolean not null default false
- allow_retry boolean not null default true
- max_attempts integer not null default 3
- metadata jsonb not null default '{}'::jsonb
- created_by uuid not null FK -> users.id
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: project_id -> projects.id
- FK: created_by -> users.id

Indexes:
- idx_quizzes_tenant_id
- idx_quizzes_project_id
- idx_quizzes_status
- idx_quizzes_created_by

---

### 8.2 quiz_questions
Purpose: Stores the question definition inside a quiz.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- quiz_id uuid not null FK -> quizzes.id
- question_text text not null
- question_type varchar(30) not null default 'single_choice'
- points integer not null default 1
- sort_order integer not null default 0
- explanation text null
- metadata jsonb not null default '{}'::jsonb
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: quiz_id -> quizzes.id

Indexes:
- idx_quiz_questions_quiz_id
- idx_quiz_questions_sort_order

---

### 8.3 quiz_question_options
Purpose: Stores possible answers for each question.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- question_id uuid not null FK -> quiz_questions.id
- option_text text not null
- is_correct boolean not null default false
- sort_order integer not null default 0
- metadata jsonb not null default '{}'::jsonb
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: question_id -> quiz_questions.id

Indexes:
- idx_quiz_question_options_question_id
- idx_quiz_question_options_is_correct

---

### 8.4 quiz_attempts
Purpose: Each attempt by a user on a quiz.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- quiz_id uuid not null FK -> quizzes.id
- user_id uuid not null FK -> users.id
- status varchar(30) not null default 'in_progress'
- score integer null
- max_score integer null
- started_at timestamptz not null
- completed_at timestamptz null
- duration_seconds integer null
- metadata jsonb not null default '{}'::jsonb
- created_at timestamptz not null
- updated_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: quiz_id -> quizzes.id
- FK: user_id -> users.id
- Unique: quiz_id + user_id + created_at?; or use a per-attempt surrogate key only

Indexes:
- idx_quiz_attempts_quiz_id
- idx_quiz_attempts_user_id
- idx_quiz_attempts_status
- idx_quiz_attempts_completed_at

---

### 8.5 quiz_attempt_answers
Purpose: Stores the user’s selected response for each question during a quiz attempt.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- attempt_id uuid not null FK -> quiz_attempts.id
- question_id uuid not null FK -> quiz_questions.id
- selected_option_id uuid null FK -> quiz_question_options.id
- free_text text null
- is_correct boolean null
- created_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: attempt_id -> quiz_attempts.id
- FK: question_id -> quiz_questions.id
- FK: selected_option_id -> quiz_question_options.id

Indexes:
- idx_quiz_attempt_answers_attempt_id
- idx_quiz_attempt_answers_question_id

---

## 9. Roadmap System

### 9.1 roadmap_items
Purpose: Represents a roadmap item or release milestone.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- project_id uuid null FK -> projects.id
- title varchar(255) not null
- description text null
- item_type varchar(50) not null default 'feature'
- status varchar(30) not null default 'planned'
- priority varchar(30) not null default 'medium'
- target_date date null
- sort_order integer not null default 0
- metadata jsonb not null default '{}'::jsonb
- created_by uuid not null FK -> users.id
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: project_id -> projects.id
- FK: created_by -> users.id

Indexes:
- idx_roadmap_items_tenant_id
- idx_roadmap_items_project_id
- idx_roadmap_items_status
- idx_roadmap_items_target_date

---

### 9.2 roadmap_item_updates
Purpose: Stores versioned updates for roadmap items.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- roadmap_item_id uuid not null FK -> roadmap_items.id
- status varchar(30) not null
- note text null
- updated_by uuid not null FK -> users.id
- created_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: roadmap_item_id -> roadmap_items.id
- FK: updated_by -> users.id

Indexes:
- idx_roadmap_item_updates_roadmap_item_id
- idx_roadmap_item_updates_created_at

---

## 10. File Management

### 10.1 files
Purpose: Stores metadata about uploaded or generated files.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- uploader_user_id uuid null FK -> users.id
- workspace_id uuid null FK -> workspaces.id
- project_id uuid null FK -> projects.id
- related_entity_type varchar(50) null
- related_entity_id uuid null
- file_name varchar(255) not null
- original_name varchar(255) not null
- mime_type varchar(150) not null
- storage_bucket varchar(100) not null
- storage_key varchar(1000) not null
- file_size_bytes bigint not null
- checksum varchar(128) null
- status varchar(30) not null default 'uploaded'
- is_public boolean not null default false
- metadata jsonb not null default '{}'::jsonb
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: uploader_user_id -> users.id
- FK: workspace_id -> workspaces.id
- FK: project_id -> projects.id

Indexes:
- idx_files_tenant_id
- idx_files_uploader_user_id
- idx_files_status
- idx_files_storage_key
- idx_files_created_at

---

### 10.2 file_versions
Purpose: Stores version history for files.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- file_id uuid not null FK -> files.id
- version_number integer not null
- storage_key varchar(1000) not null
- file_size_bytes bigint not null
- checksum varchar(128) null
- created_by uuid null FK -> users.id
- created_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: file_id -> files.id
- FK: created_by -> users.id
- Unique: file_id + version_number

Indexes:
- idx_file_versions_file_id
- idx_file_versions_created_at

---

## 11. Notifications

### 11.1 notification_preferences
Purpose: User notification configuration.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- user_id uuid not null FK -> users.id
- email_enabled boolean not null default true
- in_app_enabled boolean not null default true
- sms_enabled boolean not null default false
- channel_preferences jsonb not null default '{}'::jsonb
- created_at timestamptz not null
- updated_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: user_id -> users.id
- Unique: tenant_id + user_id

---

### 11.2 notifications
Purpose: Stores notification records destined for users.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- user_id uuid not null FK -> users.id
- notification_type varchar(50) not null
- title varchar(255) not null
- body text not null
- channel varchar(30) not null default 'in_app'
- related_entity_type varchar(50) null
- related_entity_id uuid null
- is_read boolean not null default false
- is_archived boolean not null default false
- expires_at timestamptz null
- created_at timestamptz not null
- updated_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: user_id -> users.id

Indexes:
- idx_notifications_user_id
- idx_notifications_is_read
- idx_notifications_created_at
- idx_notifications_expires_at

---

### 11.3 notification_deliveries
Purpose: Tracks downstream delivery attempts for notifications.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- notification_id uuid not null FK -> notifications.id
- provider varchar(50) not null
- status varchar(30) not null default 'pending'
- provider_message_id varchar(255) null
- error_message text null
- attempt_count integer not null default 0
- sent_at timestamptz null
- created_at timestamptz not null
- updated_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: notification_id -> notifications.id

Indexes:
- idx_notification_deliveries_notification_id
- idx_notification_deliveries_status
- idx_notification_deliveries_provider

---

## 12. Admin System

### 12.1 admin_actions
Purpose: Audit trail of privileged administrative operations.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- performed_by uuid not null FK -> users.id
- target_type varchar(50) not null
- target_id uuid null
- action_type varchar(50) not null
- action_payload jsonb not null default '{}'::jsonb
- created_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: performed_by -> users.id

Indexes:
- idx_admin_actions_performed_by
- idx_admin_actions_target_type
- idx_admin_actions_created_at

---

### 12.2 audit_events
Purpose: Append-only system audit trail for security and compliance.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- actor_user_id uuid null FK -> users.id
- entity_type varchar(100) not null
- entity_id uuid null
- event_type varchar(100) not null
- event_payload jsonb not null default '{}'::jsonb
- ip_address inet null
- user_agent text null
- created_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: actor_user_id -> users.id

Indexes:
- idx_audit_events_tenant_id
- idx_audit_events_entity_type
- idx_audit_events_event_type
- idx_audit_events_created_at

Normalization decision:
- Audit data is intentionally append-only and denormalized for query speed and history preservation.

---

## 13. AI Subsystem

### 13.1 model_providers
Purpose: Catalog of supported AI providers.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- provider_name varchar(50) not null
- provider_type varchar(50) not null
- display_name varchar(150) not null
- is_enabled boolean not null default true
- api_base_url varchar(500) null
- default_model varchar(200) null
- config jsonb not null default '{}'::jsonb
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- Unique: tenant_id + provider_name

Indexes:
- idx_model_providers_tenant_id
- idx_model_providers_is_enabled

---

### 13.2 provider_api_keys
Purpose: Securely stores provider key metadata and rotation state.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- provider_id uuid not null FK -> model_providers.id
- key_alias varchar(100) not null
- key_ciphertext text not null
- key_version varchar(50) not null
- status varchar(30) not null default 'active'
- last_used_at timestamptz null
- expires_at timestamptz null
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: provider_id -> model_providers.id
- Unique: tenant_id + provider_id + key_alias

Indexes:
- idx_provider_api_keys_provider_id
- idx_provider_api_keys_status
- idx_provider_api_keys_last_used_at

Security note:
- The actual secret material must never be stored in cleartext in the database. Only encrypted or vault-backed values should be stored.

---

### 13.3 prompt_templates
Purpose: Reusable prompt definitions for AI workflows.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- name varchar(255) not null
- template_text text not null
- model_hint varchar(200) null
- version integer not null default 1
- is_active boolean not null default true
- variables jsonb not null default '{}'::jsonb
- created_by uuid not null FK -> users.id
- created_at timestamptz not null
- updated_at timestamptz not null
- deleted_at timestamptz null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: created_by -> users.id
- Unique: tenant_id + name + version

Indexes:
- idx_prompt_templates_tenant_id
- idx_prompt_templates_is_active
- idx_prompt_templates_name

---

### 13.4 ai_requests
Purpose: Represents a submitted AI request lifecycle.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- user_id uuid not null FK -> users.id
- provider_id uuid null FK -> model_providers.id
- prompt_template_id uuid null FK -> prompt_templates.id
- request_uuid varchar(100) unique not null
- model_name varchar(200) not null
- request_type varchar(50) not null
- prompt_payload jsonb not null default '{}'::jsonb
- status varchar(30) not null default 'queued'
- priority integer not null default 5
- retry_count integer not null default 0
- max_retries integer not null default 3
- started_at timestamptz null
- completed_at timestamptz null
- timeout_seconds integer not null default 60
- error_code varchar(100) null
- error_message text null
- metadata jsonb not null default '{}'::jsonb
- created_at timestamptz not null
- updated_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: user_id -> users.id
- FK: provider_id -> model_providers.id
- FK: prompt_template_id -> prompt_templates.id
- Unique: request_uuid

Indexes:
- idx_ai_requests_tenant_id
- idx_ai_requests_user_id
- idx_ai_requests_status
- idx_ai_requests_created_at
- idx_ai_requests_provider_id
- idx_ai_requests_model_name

Partitioning recommendation:
- Partition ai_requests by created_at monthly.

---

### 13.5 ai_responses
Purpose: Stores the completed AI response and metadata.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- request_id uuid not null FK -> ai_requests.id
- provider_id uuid null FK -> model_providers.id
- response_body jsonb not null default '{}'::jsonb
- response_text text null
- finish_reason varchar(50) null
- token_prompt integer null
- token_completion integer null
- token_total integer null
- latency_ms integer null
- cost_amount numeric(12,6) null
- status varchar(30) not null default 'completed'
- created_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: request_id -> ai_requests.id
- FK: provider_id -> model_providers.id
- Unique: request_id

Indexes:
- idx_ai_responses_request_id
- idx_ai_responses_status
- idx_ai_responses_created_at
- idx_ai_responses_cost_amount

Partitioning recommendation:
- Partition ai_responses by created_at monthly.

---

### 13.6 ai_usage_analytics
Purpose: Aggregated usage analytics for cost and adoption reporting.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- user_id uuid null FK -> users.id
- provider_id uuid null FK -> model_providers.id
- model_name varchar(200) null
- request_count bigint not null default 0
- token_prompt bigint not null default 0
- token_completion bigint not null default 0
- token_total bigint not null default 0
- cost_amount numeric(12,6) not null default 0
- period_start date not null
- period_end date not null
- created_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: user_id -> users.id
- FK: provider_id -> model_providers.id
- Unique: tenant_id + provider_id + model_name + period_start + period_end + user_id

Indexes:
- idx_ai_usage_analytics_tenant_id
- idx_ai_usage_analytics_period_start
- idx_ai_usage_analytics_period_end
- idx_ai_usage_analytics_cost_amount

---

### 13.7 token_consumption
Purpose: Fine-grained token accounting for quota enforcement and billing.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- request_id uuid not null FK -> ai_requests.id
- user_id uuid not null FK -> users.id
- provider_id uuid null FK -> model_providers.id
- model_name varchar(200) not null
- prompt_tokens bigint not null default 0
- completion_tokens bigint not null default 0
- total_tokens bigint not null default 0
- cost_amount numeric(12,6) not null default 0
- created_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id
- FK: request_id -> ai_requests.id
- FK: user_id -> users.id
- FK: provider_id -> model_providers.id

Indexes:
- idx_token_consumption_request_id
- idx_token_consumption_tenant_id
- idx_token_consumption_user_id
- idx_token_consumption_created_at

---

## 14. Background Jobs and Operational Tables

### 14.1 background_jobs
Purpose: Durable queue state for asynchronous workers.

Columns:
- id uuid PK
- tenant_id uuid not null FK -> tenants.id
- job_name varchar(150) not null
- job_type varchar(50) not null
- payload jsonb not null default '{}'::jsonb
- status varchar(30) not null default 'pending'
- attempts integer not null default 0
- max_attempts integer not null default 5
- next_run_at timestamptz not null
- last_error text null
- locked_by varchar(255) null
- locked_at timestamptz null
- completed_at timestamptz null
- created_at timestamptz not null
- updated_at timestamptz not null

Constraints:
- PK: id
- FK: tenant_id -> tenants.id

Indexes:
- idx_background_jobs_status
- idx_background_jobs_next_run_at
- idx_background_jobs_created_at

---

## 15. Relationship Summary

Core relationships:
- One tenant has many users, workspaces, projects, files, AI records, notifications, and audit events.
- One workspace has many projects.
- One project has many quizzes, roadmap items, and progress tracks.
- One quiz has many questions and many attempts.
- One quiz attempt has many answer records.
- One progress track has many track items.
- One user has many progress records and progress events.
- One AI request has one AI response and many token consumption records.
- One notification has many delivery attempts.
- One admin action is performed by one user and targets one entity.

---

## 16. Normalization Decisions

### Fully normalized
- Users, roles, permissions, workspaces, projects, quizzes, questions, roadmap items, files.

### Purposefully denormalized
- usage analytics tables
- notification summaries
- high-volume audit event payloads

### JSONB usage
- Use JSONB for flexible metadata, provider configs, prompt variable definitions, and event payloads.
- Avoid using JSONB as the primary schema for business-critical entities.

---

## 17. Partitioning Strategy

Recommended partitioning for large growth tables:

- ai_requests: monthly partition by created_at
- ai_responses: monthly partition by created_at
- audit_events: monthly partition by created_at
- notifications: monthly partition by created_at
- progress_events: monthly partition by created_at
- token_consumption: monthly partition by created_at
- ai_usage_analytics: monthly partition by period_start

Why:
- These tables will grow quickly under production load.
- Partitioning keeps maintenance and vacuuming manageable.
- It also improves query performance for time-bounded reporting.

---

## 18. Indexing Strategy

Recommended indexes by table family:

- Tenant-scoped access: tenant_id in every large table
- Lookup indexes: status, type, created_at, user_id, target entity id
- Uniqueness: tenant + slug/name combination where appropriate
- Partial indexes: deleted_at is null for active records
- Composite indexes: tenant_id + status + created_at for high-volume lists
- Text search: if full text search is required, add a generated tsvector column and a GIN index

---

## 19. SQL Table Creation Order

The recommended creation order is:

1. tenants
2. users
3. roles
4. permissions
5. role_permissions
6. tenant_memberships
7. workspaces
8. projects
9. progress_tracks
10. progress_track_items
11. user_progress
12. progress_events
13. quizzes
14. quiz_questions
15. quiz_question_options
16. quiz_attempts
17. quiz_attempt_answers
18. roadmap_items
19. roadmap_item_updates
20. files
21. file_versions
22. notification_preferences
23. notifications
24. notification_deliveries
25. admin_actions
26. audit_events
27. model_providers
28. provider_api_keys
29. prompt_templates
30. ai_requests
31. ai_responses
32. ai_usage_analytics
33. token_consumption
34. background_jobs

Reasoning:
- Parent tables precede child tables.
- AI tables come after core identity and content tables because they depend on users, tenants, and providers.
- Audit and operational tables can be created after the core business tables.

---

## 20. Optimization Strategies

### 20.1 Query performance
- Use composite indexes for common access patterns.
- Avoid N+1 patterns in application query design.
- Prefer filtered queries with tenant_id and status keys.

### 20.2 Write amplification
- Keep append-only audit tables separate from mutable business tables.
- Avoid excessive updates to hot rows.
- Use bulk write patterns for analytics and event ingestion.

### 20.3 Vacuum and autovacuum
- Tune autovacuum aggressively for high-write tables.
- Schedule regular vacuum maintenance for large partitioned tables.

### 20.4 Connection management
- Ensure the application uses connection pooling.
- Avoid opening a new connection per request.

### 20.5 Storage and retention
- Archive historical AI and audit data to cold storage or secondary tables after retention windows.
- Keep the hot table set slim and indexed for current traffic.

### 20.6 Replication and failover
- Use streaming replication for high availability.
- Maintain a read replica for analytics reporting.

---

## 21. Production Recommendations

The database should be deployed with:

- PostgreSQL 16+ as the minimum target version.
- Dedicated primary and replica nodes.
- Managed backups and PITR enabled.
- Row-level security considerations for future multi-tenant hardening.
- Strong role separation between application and admin workloads.
- Encryption at rest and in transit.

---

## 22. Final Architectural Verdict

This database design is intentionally structured to support a production SaaS product with:

- Clear tenant boundaries
- Strong auditability
- AI-specific operational tables
- Progress, quiz, roadmap, and file workflows
- High-volume notification and analytics capability
- Future-proof scaling through partitioning and indexing discipline

The most important architectural decision is that AI, audit, and event data must not be mixed with core transactional records in a way that creates operational complexity. They should remain explicit, partitionable, and observable.
