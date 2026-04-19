# Release Gate Checklist — Production Deploy

**Source:** EPIC [#207](https://github.com/weppa-cloud/bukeer-studio/issues/207) — Production Certification SEO + i18n E2E.
**Owner:** Release lead of the sprint.
**When:** Run this checklist before flipping the `deploy-production` path ON in `.github/workflows/deploy.yml`, and before any subsequent production push.

Related docs: [`ci-seo-i18n-gate.md`](./ci-seo-i18n-gate.md), [[ADR-013]], [[ADR-014]], [[ADR-019]], [[ADR-020]].

---

## Go / No-Go

Every box **must** be checked and evidenced by a link or artifact id. Any unchecked box = **No-Go**.

### Automated gates

- [ ] All `@p0-seo` E2E specs green on staging (`e2e-smoke` job latest run on `main`).
      Evidence: GitHub Actions run URL.
- [ ] `npm run tech-validator:code` delta-TS gate passes (`quality` job).
      Evidence: `tech-validator-report` artifact link.
- [ ] `reports/e2e-seo-i18n/latest.json` shows **zero** `FAIL` in the `gapMatrix` object.
      Evidence: `e2e-seo-i18n-report` artifact link.
- [ ] Nightly Worker preview run (`nightly-worker-preview.yml`) from the preceding night is green.
      Evidence: GitHub Actions run URL.
- [ ] Unit + CT tests green (`npm test`).
      Evidence: same `quality` job link as above.

### Manual spot-checks

- [ ] Homepage `/site/<seeded-subdomain>` — HTML head contains expected `<title>`, `<meta description>`,
      canonical, `og:*`, `twitter:*`.
- [ ] Package detail `/site/<seeded-subdomain>/paquetes/<slug>` — same head tags + JSON-LD
      `TravelAgency`/`TouristTrip`.
- [ ] Blog detail `/site/<seeded-subdomain>/blog/<slug>` — same head tags + JSON-LD `BlogPosting`.

### SEO artifacts

- [ ] Sitemap XML validates against the sitemap schema (no 500s, root `<urlset>`, per-URL `<loc>`).
      Command: `curl -s https://<staging>/sitemap.xml | xmllint --noout -`.
- [ ] `robots.txt` served with the expected `Sitemap:` line.
- [ ] `/llms.txt` served with `200` (even if content is minimal).

### Multi-locale alignment

- [ ] [[ADR-020]] hreflang alignment confirmed for the seeded tenant:
  - Self-reference present per locale.
  - `x-default` present.
  - No locale links for non-translated-locales (per EPIC #199/#200 wave2 rules).
- [ ] Locale switcher reaches `/<en-US>/...` without redirect loop.
- [ ] Revalidate loop — POST `/api/revalidate` with the staging `REVALIDATE_SECRET` updates the
      corresponding public page within 60 s ([[ADR-011]] + [[ADR-016]]).

### Observability

- [ ] Error rate on staging (last 24 h) within nominal baseline ([[ADR-010]]).
- [ ] No open P0 issues labelled `seo,critical` in `weppa-cloud/bukeer-studio`:
      `gh issue list --label "seo,critical" --state open`.

---

## Sign-off

| Role | Name | Date | Link |
|---|---|---|---|
| Release lead |  |  |  |
| SEO owner |  |  |  |
| Platform on-call |  |  |  |

---

## Bypass appendix

If the automated gate was bypassed per `ci-seo-i18n-gate.md` §"Emergency bypass",
log the event here:

| Date | Commit | Incident issue | Bypass approver | Follow-up PR |
|---|---|---|---|---|
|  |  |  |  |  |
