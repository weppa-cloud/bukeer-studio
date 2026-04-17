# Product Landing Rollout Runbook

Use this runbook for deploying product landing changes that affect public site rendering, SEO, or ISR content.

## Preconditions

- QA matrix is complete and approved.
- Release tenant list is confirmed.
- Relevant content is ready in Supabase.
- Rollback owner and ops contact are assigned.

## Deploy Steps

1. Merge the release branch to `main`.
2. Wait for GitHub Actions to finish the `quality`, `e2e-smoke`, and `deploy-staging` jobs.
3. Verify the staging site on the release tenants.
4. Confirm SSR output, metadata, and rich results on one page per product type.
5. If a content refresh is needed, trigger on-demand ISR revalidation for the affected tenant/path.
6. Promote to production only through the approved Cloudflare Worker deploy path.
7. Recheck the release tenants after cache warmup.

## First-Hour Monitoring

Check these KPIs at T+5, T+15, T+30, and T+60 minutes:

- 5xx rate
- Worker error rate
- Response latency p95
- ISR revalidation success rate
- Revalidation log entries for the rollout window
- Search console or rich-result validation errors
- Core landing page traffic and conversion click-through
- Console errors on the public site
- Content freshness on landing pages updated since rollout date

## Rollback

Use the Cloudflare rollback command if the release causes user-facing regressions:

```bash
npx wrangler rollback
```

Rollback immediately if any of these are true:

- Broken routing or blank page on a release tenant
- Severe SEO metadata regression
- Authentication or booking CTA failure
- Sustained error-rate spike above the agreed threshold

## Ops Comms Template

Use this message in Slack, email, or incident chat:

```text
Release notice: Product landing rollout is in progress for [tenants].
Start time: [ISO timestamp]
Scope: [pages, product types, or features]
Current status: [deploying | monitoring | rolled back]
Known issues: [none | list]
Next update: [time]
Owner: [name]
```

## Post-Mortem Triggers

Open a post-mortem if any of the following happen:

- Rollback is executed
- Production outage or severe partial outage
- Customer-impacting SEO regression
- Data mismatch between stored content and rendered landing page
- More than one tenant is affected
- Fix requires an emergency hotpatch

## ISR Revalidation Checklist

- [ ] Confirm the changed landing pages are revalidated.
- [ ] Confirm related tenant variants are revalidated if they share content.
- [ ] Confirm metadata and structured data are refreshed.
- [ ] Confirm cached responses are no longer serving stale content.
- [ ] Confirm the public page and any dependent listings match Supabase data.
- [ ] Record the revalidation time and pages touched.
- [ ] If manual revalidation is required, call `POST /api/revalidate` with `Authorization: Bearer $REVALIDATE_SECRET`.

Example:

```bash
curl -X POST http://localhost:3000/api/revalidate \
  -H "Authorization: Bearer $REVALIDATE_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"subdomain":"[tenant]","path":"[optional-path]"}'
```

## Closeout

- Capture any unresolved issues in the incident thread.
- Attach screenshots or logs for failed checks.
- Schedule follow-up actions if monitoring shows a delayed regression.
