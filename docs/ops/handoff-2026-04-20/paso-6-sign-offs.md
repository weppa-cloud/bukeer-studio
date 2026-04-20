# Paso 6 — Sign-offs AC-X4a + AC-X4b

**Prereq**: Paso 4 (Flow 1 walkthrough) + Paso 5 (screencasts) complete
**Estimated**: 1h async

## AC-X4a — Partner GO/NO-GO comment on #207

**Owner**: partner ColombiaTours (contacto principal)

### Template

```markdown
## Partner GO/NO-GO — ColombiaTours pilot cutover

**Date**: 2026-MM-DD
**Partner**: <Nombre> — ColombiaTours.travel

### Verdict
✅ **GO** — readiness confirmed for DNS cutover
<!-- alternativa: ❌ NO-GO — blockers listed below -->

### Reviewed

- [ ] Flow 1 walkthrough en subdomain piloto — UX acceptable
- [ ] Pkg 15D + Act Guatape data fill review — conforme
- [ ] Translation es-CO → en-US — quality acceptable
- [ ] Hotel render (Flutter-owner, as-is) — conforme
- [ ] Booking CTA WhatsApp + phone (no form, ADR-024 DEFER confirmed) — conforme
- [ ] Training videos (W7-c Loom) — útiles, partner team onboarded

### Open items (non-blocking)

- <lista items menores que partner acepta manejar post-cutover>

### Cutover window

Propongo ventana: **<día off-hours + hora zona horaria CO>** — ej. Martes 02:00-04:00 CO (low-traffic).

### Rollback authority

Autorizo rollback automático por ops si:
- Lighthouse score drops > 10 puntos en cualquier métrica
- Error rate Worker > 1% durante 5 min continuos
- Partner reporta issue crítico dentro de primera hora

cc @<ops-lead> @<qa-lead>
```

Posting:
```bash
gh issue comment 207 --body-file /path/to/partner-go.md
# O via GitHub UI directamente
```

## AC-X4b — QA-lead sign-off comment on #207

**Owner**: QA-lead

### Template

```markdown
## QA sign-off — ColombiaTours pilot #213

**Date**: 2026-MM-DD
**QA-lead**: <nombre>
**Reference doc**: [docs/qa/pilot/sign-off-2026-04-20.md](../blob/main/docs/qa/pilot/sign-off-2026-04-20.md)
**Flow 1 report**: [docs/qa/pilot/flow-1-walkthrough-2026-04-20.md](../blob/main/docs/qa/pilot/flow-1-walkthrough-2026-04-20.md)

### AC-A coverage (Flow 1 story-by-story)

- [x] AC-A1 — 11 stories executed on colombiatours subdomain con data real
- [x] AC-A2 — screenshots desktop + mobile archivados
- [x] AC-A3 — zero console errors, warnings triaged
- [x] AC-A4 — zero network 5xx, 4xx expected-only
- [x] AC-A5 — Lighthouse 3 pages passed gate (SEO ≥ 0.95, a11y ≥ 0.95)

### AC-B coverage (Flow 2 matrix 48 rows + Section P)

- [x] Pkg matrix rendered + editable via Studio (Pkg 15D canonical)
- [x] Act matrix rendered + editable via Studio (Guatape canonical)
- [x] Hotel matrix read-only (ADR-025 Flutter-owner)
- [x] Blog matrix Section P rendered + translated
- [x] Section M booking DEFER (ADR-024) — n/a-skip confirmed

### AC-C coverage (Flow 3 transcreate lifecycle)

- [x] Pkg: draft → reviewed → applied → public EN render
- [x] Act: same lifecycle
- [x] Blog: same lifecycle
- [x] hreflang es-CO + en-US + x-default
- [x] Drift detection + stale status
- [x] Stream abort recovery

### AC-X coverage (tech gate + sign-off)

- [x] AC-X1 — #207 W5.1-W5.4 CI gate green (0 failed / 0 did-not-run / justified skips)
- [x] AC-X2 — Worker preview serves ≥1 pkg detail + ≥1 translated URL
- [x] AC-X3 — W5.7 (nightly Worker preview) — live
- [x] AC-X4a — Partner GO (cross-ref #issuecomment-XXXXX)
- [x] AC-X4b — QA-lead this comment

### Shipping PRs

#225 · #227 · #229 · #230 · #231 · #232 · #233 · #235 · #237 · #238 · #239 · #241 · #242 · #243 · #244 · #245 · #246 · #247 · #248 · (#249 cluster F si shipped)

### Residuals (non-blocking, post-cutover follow-ups)

- #234 cross-repo RPC video_url JOIN → unlocks VideoObject JSON-LD active pass
- #<cluster-F residual ticket> si aplica
- Lighthouse desktop pkg timeout ocasional — flake, not regression

### Verdict

✅ **Autonomous readiness signed off.** Handoff to ops for Stage 7 DNS cutover.

cc @<ops-lead> @<partner>
```

Posting:
```bash
gh issue comment 207 --body-file /path/to/qa-signoff.md
```

## Close #213

Post ambos sign-offs:
```bash
gh issue close 213 --comment "Partner AC-X4a GO + QA AC-X4b signed 2026-MM-DD. Autonomous + walkthrough portions complete. Handoff to ops (Paso 7 DNS cutover) per runbook docs/ops/pilot-runbook-colombiatours.md."
```

## Cascade close

Once #213 closed:
```bash
# Check W7 status — close only if #221 AC-W7-3 done (W7-c screencasts shipped)
gh issue view 221 --json state
# If still open with W7-c pending → keep open until paso 5 done

# Close EPIC #214 after #213 + #221 cerrados
gh issue close 214 --comment "Pilot Readiness EPIC complete: 7/7 W children closed, #213 signed off, Stage 7 cutover in ops hands. Ref: commit timeline 2026-04-19 → 2026-MM-DD."
```
