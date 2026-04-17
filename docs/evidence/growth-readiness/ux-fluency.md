# UX Fluency Matrix — colombiatours.travel

Generated: 2026-04-17T12:04:40.312Z
Website: `894545b7-73ca-4dae-b76a-da5b6a3f8441`

## Matrix

| Flujo | Navigable | Latency <3s | Errors labeled | Feedback loop | Can complete solo | Verdict |
|-------|-----------|-------------|----------------|---------------|-------------------|---------|
| Setup GSC/GA4 | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |
| Striking distance | ✓ | ✓ | ✓ | ✗ | ✓ | **PASS** |
| Keyword research multi-market | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |
| Cluster planning | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |
| Brief generation | ✓ | ✓ | ✓ | ✓ | ✗ | **PASS** |
| Optimize page locale-specific | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |
| Blog creation + AI + publish | ✓ | ✓ | ✗ | ✗ | ✗ | **FAIL** |
| Transcreate draft→review→apply | ✓ | ✓ | ✓ | ✓ | ✗ | **PASS** |
| Gestión traducciones (dashboard) | ✗ | — | ✗ | ✗ | ✗ | **FAIL** |
| Tracking | ✓ | ✓ | ✓ | ✓ | ✓ | **PASS** |

## Notes

- **Setup GSC/GA4** — OAuth connect + configure + refresh shipped. Config tab lists both providers.
- **Striking distance** — Source labelled mock/live correctly in UI. Data pipe depends on seo_keywords seeded from GSC.
- **Keyword research multi-market** — Locale-native accepted via body. Differentiation es-CO vs en-US validated.
- **Cluster planning** — Clusters board renders, create endpoint operational.
- **Brief generation** — Brief workflow modal exists; no inline editor integration — user must navigate to item detail.
- **Optimize page locale-specific** — Guardrail package blocks truth-field. SEO overlay applied via /optimize.
- **Blog creation + AI + publish** — AI generate endpoint exists but no visible button in editor UI. Publish toggle works via status.
- **Transcreate draft→review→apply** — Hidden under SEO item detail → Translate tab (2 clicks from editor). No bulk.
- **Gestión traducciones (dashboard)** — NO dedicated /translations route. Cannot answer "which posts missing en-US?".
- **Tracking** — Overview + top pages render with real GA4/GSC data when sync recent.

## Score: 8/10 PASS