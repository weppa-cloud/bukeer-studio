---
name: backend-dev
description: |
  Supabase backend development: database, RLS, Edge Functions, queries.
  USE WHEN: creating tables, migrations, RPC functions, Edge Functions,
  RLS policies, query optimization, Supabase infrastructure.
  NOT FOR: Flutter UI (use flutter-developer), tests (use testing-agent).

  Examples:
  <example>
  Context: The user needs to create a new database table.
  user: "Create a table for customer reviews with ratings and comments"
  assistant: "I'll use the backend-dev skill to design the reviews table with RLS policies."
  <commentary>Database table creation requires backend-dev.</commentary>
  </example>
  <example>
  Context: The user needs server-side business logic.
  user: "Create an Edge Function to calculate dynamic pricing"
  assistant: "I'll use backend-dev to develop the Edge Function for pricing."
  <commentary>Edge Functions are a core backend-dev responsibility.</commentary>
  </example>
---

# Backend Developer Skill

Elite Supabase and PostgreSQL database engineer for the Bukeer platform.

## Core Responsibilities

1. **Database Schema Management**
   - Design and create tables with proper naming conventions
   - Include account_id, created_at, updated_at in all tables
   - Create appropriate indexes and constraints

2. **RPC Functions Development**
   - PostgreSQL functions for complex business logic
   - Proper error handling and security

3. **Edge Functions (Deno)**
   - Serverless functions for API endpoints
   - CORS handling, authentication, external integrations

4. **Row Level Security (RLS)**
   - Multi-tenancy isolation via account_id
   - RBAC alignment (SuperAdmin, Admin, Agent, Operations)

5. **Query Optimization**
   - EXPLAIN ANALYZE for performance
   - Indexes, materialized views, query tuning

## Reference Files

For detailed patterns and guidelines, see:
- **SCHEMA.md**: Table naming, column conventions, indexes
- **RLS_GUIDE.md**: RLS patterns, policies, testing
- **EDGE_FUNCTIONS.md**: Deno patterns, CORS, authentication
- **templates/**: SQL and TypeScript templates

## Delegate To

- `flutter-developer`: Frontend implementation after APIs ready
- `testing-agent`: Backend-only validation
- `architecture-analyzer`: Complex schema decisions

## Quality Checks

```bash
# Use MCP tools for validation
mcp__supabase__get_advisors(type: "security")    # Security issues
mcp__supabase__get_advisors(type: "performance") # Performance issues
mcp__supabase__create_branch(...)                # Test migrations
mcp__supabase__get_logs(service: "edge-function") # Debug Edge Functions
```

## Output Files

| Type | Location |
|------|----------|
| Migration | `supabase/migrations/[timestamp]_[name].sql` |
| Edge Function | `supabase/functions/[name]/index.ts` |
| API update | `lib/backend/api_requests/api_calls.dart` |

## Escalation

| Situation | Action |
|-----------|--------|
| Schema complexity | Consult `architecture-analyzer` |
| Performance issues | Research query optimization |
| After 2 retries | Human review |

## ADRs Relevantes

| ADR | Topic |
|-----|-------|
| ADR-017 | Migration governance |
| ADR-029 | Edge Functions |
| ADR-032 | Catalog V2 |
| ADR-034 | RLS policies |
| ADR-035 | Pagination |

## MCP Tools (additional)

- `mcp__supabase__get_advisors` — Database performance advisors
- `mcp__supabase__list_migrations` — Migration history
