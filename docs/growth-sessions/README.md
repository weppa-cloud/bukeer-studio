# Growth Sessions — per-session audit trail

Every agent session that executes SEO/translation/optimization work writes one session log here. Humans can also log manual sessions for continuity.

## Naming convention

```
docs/growth-sessions/YYYY-MM-DD-HHMM-{scope}-{agent}.md
```

Examples:
- `2026-04-17-0900-daily-check-claude-code.md`
- `2026-04-17-1400-translate-blog-claude-code.md`
- `2026-04-18-1030-content-create-manual.md`

Scope values: `daily-check`, `weekly-planning`, `friday-review`, `content-create`, `translate`, `audit`, `bulk`, `debug`, `other`.

## Why persist

- Multi-session continuity — next agent session reads last N logs for context
- Audit trail pre `seo_ai_actions` table ship (Tier 2)
- Rollback reference — session log records before/after states for key mutations
- Training signal — reviewable history for prompt refinement

## Structure

See [TEMPLATE.md](./TEMPLATE.md).

## Mandatory logging rules

Per SAFETY.md (skill `seo-growth-agent`):

- **Every mutation** (INSERT, UPDATE, DELETE to Supabase) logged with before/after JSON
- **Every API call** that costs money (DataForSEO, NVIDIA Nim LLM) logged with estimated cost
- **Every external fetch** logged with URL + timestamp
- **Decision points** where agent picked one path over another logged with reasoning

## Retention

No deletion. Old sessions stay committed as historical record. Archive review every 6 months for prompt improvement.
