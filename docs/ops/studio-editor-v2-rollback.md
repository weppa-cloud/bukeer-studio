# Studio Editor v2 — Rollback Runbook

**Status:** Active
**Date:** 2026-04-18
**Applies to:** #190 Phase 1a/1b/2 rollout of the Studio unified product editor
**Related:** [[ADR-0xx]] (dual-write strategy · pending) · [[SPEC_MULTI_LOCALE_REMEDIATION]] (similar rollback philosophy) · W3 [#197] · R7 [#194]

## 0 · When to invoke

Invoke this runbook when **any** of the following fire:

1. `reconciliation_alerts` rows with `severity='error'` tied to `source='studio_editor_v2'` in the last 60 min.
2. `reconcile_product_surfaces('package_kit', '1 hour')` returns `anomalies_count > 0` during a pilot window.
3. Pilot customer opens a ticket: "Studio overwrote my Flutter edit" / "Campo aparece vacío después de guardar".
4. Studio server action error rate > 1% on `/api/dashboard/.../marketing/*` for 15 min (Vercel / CF logs).
5. Planned rollout pause ahead of a Flutter release cutting the shared DB schema.

Do NOT invoke for:

- Single-user confusion about field ownership (educate first).
- One-off Studio 500 without dual-write evidence.
- Missing AI badge / stale flag reset (cosmetic — file issue).
- Designer-reference pilot theme incidents (`theme_designer_v1_enabled`) — use [[pilot-theme-designer-v1-rollout]].

## 1 · Rollback levels (pick the smallest that works)

| Level | Scope | Who feels it | Reversal time |
|-------|-------|--------------|---------------|
| L1 — Field | One field across one website | Users editing that field in Studio | ~seconds |
| L2 — Website | All Studio fields across one website | Users of that website | ~seconds |
| L3 — Account | All Studio fields across all websites of an account | Entire account | ~seconds |
| L4 — Data restore | Restore `package_kits` rows from `package_kits_audit_log.previous_row` snapshots | Catastrophic last resort | Minutes to hours |

**Rule of thumb:** start at the smallest level that re-closes the reconciliation alert, then escalate.

## 2 · Level 1 — Per-field rollback

Disable a single field via the flag RPC. Studio renders the editor in `readOnly` and the server action enforces `FIELD_NOT_STUDIO_OWNED`.

```sql
-- Remove `description` from the enabled fields for one website
select public.toggle_studio_editor_v2(
  p_account_id := '<ACCOUNT_UUID>',
  p_website_id := '<WEBSITE_UUID>',
  p_enabled    := true,          -- keep other fields live
  p_fields     := array['program_highlights','program_inclusions','program_exclusions']
);
```

Verify:
```sql
select public.resolve_studio_editor_v2(
  p_account_id := '<ACCOUNT_UUID>',
  p_website_id := '<WEBSITE_UUID>'
);
-- enabled=true, fields=['program_highlights',...], scope='website'
```

Studio page refresh → editor for the disabled field must show "Solo lectura — este campo se edita en Flutter."

## 3 · Level 2 — Per-website rollback

```sql
select public.toggle_studio_editor_v2(
  p_account_id := '<ACCOUNT_UUID>',
  p_website_id := '<WEBSITE_UUID>',
  p_enabled    := false,
  p_fields     := array[]::text[]
);
```

Effect: **all** marketing editors on this website fall back to Flutter ownership. Scope resolution returns `scope='website'`, `enabled=false`, no fields passed → `isStudioFieldEnabled(...)` always returns false.

## 4 · Level 3 — Per-account rollback

```sql
select public.toggle_studio_editor_v2(
  p_account_id := '<ACCOUNT_UUID>',
  p_website_id := null,
  p_enabled    := false,
  p_fields     := array[]::text[]
);
```

Affects every website owned by the account. Use when the issue spans multiple sites (shared account-scoped bug, stale cache, etc.). Re-enable per website as you verify each.

## 5 · Level 4 — Data restore (nuclear)

Only if you have confirmed data corruption (Studio wrote bad values Flutter can't regenerate).

Steps:

```sql
-- Locate the suspect UPDATE
select id, created_at, surface, changed_fields, previous_row, new_row
  from public.package_kits_audit_log
  where package_kit_id = '<PRODUCT_UUID>'
    and created_at > now() - interval '24 hours'
  order by created_at desc
  limit 20;
```

Identify the last known-good row (usually `surface='flutter'` or `surface='trigger_default'` before the first Studio write). Then restore:

```sql
-- Narrow window migration — DO NOT run as ad-hoc query in prod without review
update public.package_kits kit
   set description            = (audit.previous_row->>'description'),
       program_highlights     = (audit.previous_row->'program_highlights'),
       program_inclusions     = (audit.previous_row->'program_inclusions'),
       program_exclusions     = (audit.previous_row->'program_exclusions'),
       program_notes          = (audit.previous_row->>'program_notes'),
       program_meeting_info   = (audit.previous_row->>'program_meeting_info'),
       cover_image_url        = (audit.previous_row->>'cover_image_url'),
       description_ai_generated = coalesce((audit.previous_row->>'description_ai_generated')::bool, false),
       highlights_ai_generated  = coalesce((audit.previous_row->>'highlights_ai_generated')::bool, false),
       last_edited_by_surface = 'system',
       updated_at             = now()
  from public.package_kits_audit_log audit
 where audit.id = '<AUDIT_ROW_UUID>'
   and kit.id = audit.package_kit_id;
```

The restore itself generates a new audit row with `source='trigger_default'` — call it out in the incident log.

After restore:
1. Run Level 2 or 3 rollback so Studio doesn't overwrite again.
2. Trigger ISR revalidation: `POST /api/revalidate?path=/paquetes/<slug>&secret=$REVALIDATE_SECRET`.
3. Validate on the public site.

## 6 · Verification after any rollback

```sql
-- Expect anomalies_count=0
select public.reconcile_product_surfaces('package_kit', interval '1 hour');

-- Expect severity!='error' in the most recent rows
select id, severity, summary, created_at
  from public.reconciliation_alerts
  where source = 'studio_editor_v2'
    and created_at > now() - interval '1 hour'
  order by created_at desc
  limit 20;
```

Studio UI:
- Navigate to `/dashboard/[w]/products/[slug]/marketing`.
- Each disabled field should show the Flutter-owned read-only card.
- `/dashboard/[w]/ops/reconciliation` surface: no new `error` rows for the next 10 min.

## 7 · Communication template (incident channel)

```
🟠 Studio Editor v2 — rollback L<N>
Scope: account=<id> website=<id> field=<if L1>
Trigger: <reconciliation_alerts row id / customer ticket>
State: rolled back, Flutter owns. Studio write path returns FIELD_NOT_STUDIO_OWNED.
Next: root-cause in <github issue link>. Re-enable planned <date/time>.
```

Post-incident:
- [ ] Create GitHub issue tagging #190 + `incident` label.
- [ ] Attach `reconcile_product_surfaces` output, `reconciliation_alerts` rows, Vercel/CF logs.
- [ ] Add learnings to `docs/ops/studio-editor-v2-rollback.md` (this file) + memory.

## 8 · Pre-flight before re-enabling after rollback

Before running `toggle_studio_editor_v2(..., enabled=true, ...)` again:

1. Root cause fixed and merged to `main`.
2. Staging Worker deploy green.
3. `reconcile_product_surfaces` on staging dataset returns `anomalies_count=0` for 24 h.
4. Flutter banner (#205) deployed in Flutter production so the Flutter user knows Studio now owns the field.
5. Announce in customer channel before flip.

## 9 · Not yet supported (tracked)

- Automated rollback via Vercel cron when `severity='error'` crosses threshold — queued behind #190 Phase 1b.
- Per-field rollback UX in Studio (today: super_admin SQL only).
- Audit log diff UI beyond `/ops/reconciliation` — planned for R9 D3.
