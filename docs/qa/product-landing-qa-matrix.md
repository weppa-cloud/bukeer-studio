# Product Landing QA Matrix

Use this matrix for product landing pages on the 3 release tenants before rollout.

## Scope

- Tenants: `tenant-1`, `tenant-2`, `tenant-3` and their current production slugs
- Product types: `hotel`, `activity`, `transfer`, `package`
- Breakpoints:
  - Mobile: `390x844`
  - Tablet: `768x1024`
  - Desktop: `1440x900`
- Themes: `light`, `dark`

## Run Order

1. Open the landing page for each tenant and product type.
2. Verify each breakpoint in both light and dark themes.
3. Run the pass/fail checklist below for every tenant.
4. Log failures with tenant, product type, breakpoint, theme, and URL.

## Matrix

| Tenant | Product Type | Mobile | Tablet | Desktop | Light | Dark | Result |
|---|---|---:|---:|---:|---:|---:|---|
| tenant-1 | hotel | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| tenant-1 | activity | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| tenant-1 | transfer | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| tenant-1 | package | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| tenant-2 | hotel | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| tenant-2 | activity | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| tenant-2 | transfer | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| tenant-2 | package | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| tenant-3 | hotel | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| tenant-3 | activity | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| tenant-3 | transfer | [ ] | [ ] | [ ] | [ ] | [ ] |  |
| tenant-3 | package | [ ] | [ ] | [ ] | [ ] | [ ] |  |

## Pass/Fail Checklist

Mark `PASS` only if every item is true for the tested tenant/product/page.

- [ ] Lighthouse passes the agreed threshold for Performance, Accessibility, Best Practices, and SEO.
- [ ] WCAG AA checks pass for contrast, focus state, keyboard access, and visible labels.
- [ ] Rich results render correctly and the page has no schema errors in validation.
- [ ] E2E passes through the session pool, using the current isolated session command.
- [ ] No layout breakage at the tested breakpoint.
- [ ] Light and dark themes both render with correct tokens and readable text.
- [ ] Primary CTA, product details, and booking/contact paths work.

## E2E Command

Use the session pool command, not a direct Playwright run:

```bash
npm run session:run -- --grep "product landing"
```

If you need an isolated manual session:

```bash
eval "$(bash scripts/session-acquire.sh)"
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session
```

## Failure Log

Record failures with this format:

| Tenant | Product Type | Breakpoint | Theme | Check | Evidence | Owner |
|---|---|---|---|---|---|---|
|  |  |  |  |  |  |  |

## Exit Criteria

- All 12 tenant/product combinations reviewed
- All breakpoints checked in both themes
- No open P0/P1 visual, accessibility, SEO, or routing defects
