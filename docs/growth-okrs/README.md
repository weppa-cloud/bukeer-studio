# Growth OKRs — targets + current values per website

Persisted OKR state for 7D / 30D / 90D cycles. Source of truth pre-#148 (`seo_website_okrs` table). Post-#148 these files remain as human-readable exports.

## Structure

```
docs/growth-okrs/
├── active.md                   # Current snapshot per website (latest)
├── budget.md                   # Manual provider budget counters
├── TEMPLATE-active.md          # Format reference
└── history/
    ├── YYYY-MM-{website}.md    # Monthly archive
    └── YYYY-Q{n}-{website}.md  # Quarterly archive
```

## active.md

Single file containing all websites' active OKRs. Structured per website. See [TEMPLATE-active.md](./TEMPLATE-active.md).

## Lifecycle

- **Daily:** agent playbook `daily-check` reads targets + updates `current_value` if GSC/GA4 sync available
- **First Monday of month:** archive previous month snapshot to `history/YYYY-MM-{website}.md`, reset period
- **First Monday of quarter:** archive 90D objectives + open new

## Agent read pattern

Before any planning session, agent reads `active.md` to understand:
- What targets matter this period
- How far from target (progress %)
- Which KPIs are lagging (drive Quick Wins prioritization)

## Agent write pattern

- Only updates `current_value` + `current_fetched_at` (NOT `target` — that's human decision)
- Changes to `target` require explicit user confirmation in session
- 90D objectives edits require wizard step or explicit user approval
