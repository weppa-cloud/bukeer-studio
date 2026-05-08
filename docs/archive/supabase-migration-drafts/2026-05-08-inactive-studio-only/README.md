# Inactive Studio-Only Supabase Migration Archive

Archived on 2026-05-08 during the Studio/Flutter Supabase migration
reconciliation.

These files were removed from the active `supabase/migrations` path because
they are Studio-only migrations that are not related to the currently open local
workstreams:

- `codex/growth-os-epic441-production`
- `codex/fix-main-lint-any` / Funnel Events SOT

Most of these files were already represented in production under alternate
Supabase migration names or were older Studio drafts. They must not be applied
from this archive. If one becomes relevant again, recreate a reviewed,
forward-only migration with a new timestamp, mirror it into `bukeer_flutter`,
and apply it from the Flutter migration workflow.

The active Studio migration folder intentionally keeps only Growth/Funnel/WAFlow
and booking-related candidates for the current local work.
