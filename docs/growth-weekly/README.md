# Growth Weekly — Quick Wins planning per week

Persisted state for Monday weekly planning sessions. Each file represents one ISO week (`YYYY-WW`) for one website.

## Naming convention

```
docs/growth-weekly/YYYY-WW-{websiteSlug}.md
```

Example: `docs/growth-weekly/2026-W16-colombiatours-travel.md`

## Structure

See [TEMPLATE.md](./TEMPLATE.md).

## Source of truth

- **Tier 1 MVP (pre-#149 ship):** These files ARE the source of truth. Agent edits directly.
- **Post-#149 ship:** `seo_weekly_tasks` table becomes source. These files remain as human-readable audit log + weekly digest.

## Lifecycle

1. **Monday AM** — agent generates new week file from real data (GSC striking distance, low CTR, drift, cannibalization) via skill `seo-growth-agent` playbook `weekly-planning`
2. **Tue-Fri** — agent or human marks tasks as `in_progress` / `done` as executed
3. **Friday PM** — agent runs playbook `friday-review`, updates file with actuals, appends reflection
4. **Next Monday** — new file created, previous week archived (stays in repo under same path)

## Agent read pattern

```
1. Read `docs/growth-okrs/active.md` to understand current targets
2. Query GSC / Supabase for real data
3. Write new `YYYY-WW-{website}.md` using TEMPLATE
4. Reference file in session log (see docs/growth-sessions/)
```
