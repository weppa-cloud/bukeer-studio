---
session_id: "2026-04-28-1508-epic310-tracking-smoke"
started_at: "2026-04-28T15:00:00-05:00"
ended_at: "2026-04-28T15:08:14-05:00"
agent: "codex-orchestrator"
scope: "epic310-tracking-smoke"
website_id: "894545b7-73ca-4dae-b76a-da5b6a3f8441"
website_slug: "colombiatours-travel"
initiator: "procede con todo"
outcome: "completed"
linked_weekly: "docs/growth-weekly/2026-04-27-experiments.md"
related_issues: [310, 322, 330, 332, 337]
---

# Session epic310-tracking-smoke — colombiatours-travel — 2026-04-28 15:08

## Intent

Avanzar Epic #310 end-to-end después de reautorizar GSC/GA4, dejando evidencia operativa para tracking y atribución.

## Plan

1. Validar estado real de Supabase, integraciones y tablas Growth.
2. Ejecutar smoke WAFlow + Chatwoot contra servidor local con ColombiaTours.
3. Corregir bloqueos mínimos de schema/constraints que impidan el smoke.
4. Endurecer tests para certificar que `funnel_events` se inserta realmente.

## Executed actions

### 1. Supabase read-only baseline

- **Tool:** Supabase SQL + Node Supabase client.
- **Input:** conteos de tablas Growth, `seo_integrations`, `seo_provider_usage`.
- **Output:** GSC, GA4 y DataForSEO conectados; DataForSEO tenía 1 usage/cache. `funnel_events` y `meta_conversion_events` estaban en 0 antes del smoke.
- **Reasoning:** confirmar si #322 seguía bloqueado por schema o por falta de eventos.

### 2. Runtime smoke WAFlow

- **Tool:** local Next server `http://localhost:3003` + `curl`.
- **Input:** `POST /api/waflow/lead` con reference `SMK-0428-150408`, UTM `smoke/cpc/tracking-smoke`, subdomain `colombiatours`.
- **Output:** primer intento falló por `onConflict=session_key,variant`; después de migration fix respondió `201`.
- **Reasoning:** validar el camino real que emite `waflow_submit` y log Meta Lead.

### 3. Runtime smoke Chatwoot

- **Tool:** `scripts/chatwoot-webhook-simulate.sh`.
- **Input:** `qualified_lead` y `quote_sent` para conversation `codex-SMK-0428-150408`.
- **Output:** ambos webhooks `200`, `matched=true`; lifecycle events procesados y logs Meta creados.
- **Reasoning:** validar que Chatwoot puede avanzar el funnel a qualified lead y quote sent.

### 4. Tests and typecheck

- **Tool:** Jest + TypeScript.
- **Input:** WAFlow route, Chatwoot webhook route, analytics tracking tests.
- **Output:** `14/14` tests PASS; `npm run typecheck` PASS.
- **Reasoning:** evitar falso verde: los tests ahora fallan si no se inserta `funnel_events`.

## Mutations

| Entity | Action | Before | After | Source |
|--------|--------|--------|-------|--------|
| Supabase schema | Add full unique index `waflow_leads_session_key_variant_full_uidx` | Partial unique index no usable por PostgREST `onConflict` | WAFlow upsert responde `201` | `20260428154000_waflow_leads_full_session_variant_unique.sql` |
| Supabase schema | Add `public_rate_limits` | Tabla faltante, rate limit fallaba open | Tabla existe con RLS service-role | `20260428155001_public_rate_limits_operational.sql` |
| Supabase schema | Add `webhook_events` | Chatwoot webhook fallaba 500 | Webhooks procesan con idempotencia | `20260428155002_webhook_events_operational.sql` |
| Supabase data | Insert WAFlow smoke lead | 0 eventos smoke | 1 `waflow_leads`, 1 `waflow_submit` | `/api/waflow/lead` |
| Supabase data | Insert Chatwoot smoke lifecycle | 0 eventos smoke | 2 `webhook_events`, `qualified_lead`, `quote_sent` | `scripts/chatwoot-webhook-simulate.sh` |
| Supabase data | Insert Meta logs | 0 logs smoke | 4 `meta_conversion_events`, status `skipped` because Meta env absent locally | `sendMetaConversionEvent` |

## Evidence

Reference code: `SMK-0428-150408`.

Counts by reference:

| Table | Rows |
|---|---:|
| `waflow_leads` | 1 |
| `funnel_events` | 3 |
| `meta_conversion_events` | 4 |
| `webhook_events` | 2 |

Funnel events:

| Event | Stage | Channel | UTM |
|---|---|---|---|
| `waflow_submit` | `activation` | `waflow` | `smoke / cpc / tracking-smoke` |
| `qualified_lead` | `qualified_lead` | `chatwoot` | `smoke / cpc / tracking-smoke` |
| `quote_sent` | `quote_sent` | `chatwoot` | `smoke / cpc / tracking-smoke` |

Meta logs:

| Event | Status | Reason |
|---|---|---|
| `Lead` | `skipped` | Missing local `META_PIXEL_ID` / `META_ACCESS_TOKEN` |
| `ConversationContinued` | `skipped` | Missing local `META_PIXEL_ID` / `META_ACCESS_TOKEN` |
| `QualifiedLead` | `skipped` | Missing local `META_PIXEL_ID` / `META_ACCESS_TOKEN` |
| `QuoteSent` | `skipped` | Missing local `META_PIXEL_ID` / `META_ACCESS_TOKEN` |

## External costs

| Provider | Operation | Cost USD | Notes |
|----------|-----------|----------|-------|
| Meta | CAPI send | 0 | Local env lacks Meta credentials; rows logged as `skipped`. |
| DataForSEO | none | 0 | No new DataForSEO call in this session. |

## Decisions / trade-offs

- Added a full unique index instead of changing API code because the API contract already requires `sessionKey`; this preserves idempotent upsert semantics.
- Added minimal operational tables instead of the full booking migrations to avoid unrelated production surface area while unblocking #322.
- Kept Meta as `skipped`, not `sent`, because local secrets are absent. This is acceptable for ledger/idempotency validation but not for paid-scale certification.

## Outputs delivered

- Migration: `supabase/migrations/20260428154000_waflow_leads_full_session_variant_unique.sql`
- Migration: `supabase/migrations/20260428155001_public_rate_limits_operational.sql`
- Migration: `supabase/migrations/20260428155002_webhook_events_operational.sql`
- Tests hardened:
  - `__tests__/api/waflow-lead-route.test.ts`
  - `__tests__/api/chatwoot-webhook-route.test.ts`

## Next steps / handoff

- Configure Meta staging/test credentials to move `meta_conversion_events.status` from `skipped` to `sent`.
- Keep #322 open for Wompi `booking_confirmed` / Purchase.
- Mirror these operational migrations into `bukeer-flutter` migration governance path.
- Re-run `STRICT_ADS_ZERO` with an available clean session and matching test grep/file; current grep returned `No tests found`.

## Self-review

The smoke surfaced two real production blockers that unit tests previously hid: PostgREST could not infer the partial unique index, and Chatwoot had no webhook ledger table. The tracking path is now operational through quote sent, with paid send still gated by Meta credentials.
