---
tenant: colombiatours-travel
website_id: 894545b7-73ca-4dae-b76a-da5b6a3f8441
epic: 310
spec: 337
issue: 335
last_updated: 2026-04-27
status: active
---

# Local SEO Runbook — ColombiaTours

> Operational playbook for Google Business Profile (GBP), reviews, citations, NAP consistency, and local content cadence. Pairs with [active OKRs](../growth-okrs/active.md) and [authority pipeline](./authority-pipeline.md). Markets covered: **CO (primary)**, **MX (secondary)**, **US (EN expansion)** — each tracked separately.

## 1. Why local SEO for a travel agency

ColombiaTours appears in many local-intent SERPs ("agencia de viajes Bogotá", "tour operator Cartagena"). GBP placement, reviews velocity and citation hygiene drive map-pack visibility, which feeds qualified trip requests. Quality signals (photos, hours, posts, Q&A) compound brand authority and convert to North Star.

## 2. Per-market scope

| Market | GBP locations | Primary language | Reviews target/mo | Notes |
|---|---|---|---|---|
| CO | Headquarters Bogotá + Cartagena | es-CO | 12 | Existing profile, audit needed |
| MX | Virtual office or partner | es-MX | 4 | Decide on physical presence Q3 |
| US | None initially (service-area) | en-US | 2 (US travelers reviewing post-trip) | Service-area business setup possible Q3 |

> Never aggregate review counts across markets in dashboards.

---

## 3. GBP audit checklist (CO primary)

Run quarterly. Owner: A5.

### Profile completeness

- [ ] Business name = legal entity name; **no keyword stuffing** (e.g., not "ColombiaTours - Best Tours").
- [ ] Primary category set to `Travel agency`.
- [ ] Up to 9 secondary categories filled (e.g., `Tour operator`, `Sightseeing tour agency`, `Travel lounge`, `Wedding planner` if relevant).
- [ ] Address matches NAP source-of-truth (see §6).
- [ ] Phone primary + secondary set (use tracking number with call forwarding for paid attribution; primary = main).
- [ ] Website URL = `https://colombiatours.travel/` (canonical, with trailing slash, https).
- [ ] Hours filled including special hours (holidays, Semana Santa, year-end).
- [ ] Service area defined (entire country if applicable, or relevant cities).
- [ ] Attributes filled: `LGBTQ+ friendly`, `Identifies as women-owned` (if true), `Online appointments`, `Wheelchair accessible entrance`.
- [ ] Description ≤ 750 chars, no URLs, value prop in first 250 chars.
- [ ] Opening date (founding year) set.

### Visual assets

- [ ] Logo (square, 250×250 min, transparent or solid bg).
- [ ] Cover photo (1080×608, brand-quality).
- [ ] ≥ 10 interior/team photos.
- [ ] ≥ 20 destination/tour photos rotated quarterly.
- [ ] At least 1 short video (≤ 30s) tagged with destination.

### Posts cadence

- [ ] At least **1 GBP post per week** (offers, events, updates).
- [ ] Posts include CTA (`Book` / `Learn more`) with UTM tag (`utm_source=google&utm_medium=organic&utm_campaign=co_gbp_post_<asset>_YYYYMM`).
- [ ] Avoid posts with prohibited content (alcohol, gambling).

### Q&A

- [ ] Pre-seed top 10 FAQs (cancellation, languages, payment, group sizes, kids, accessibility, etc.).
- [ ] Monitor weekly — answer within 48h.

### Messaging

- [ ] GBP messaging enabled and linked to Chatwoot.
- [ ] Auto-reply set with expected response window (≤ 4h business hours).

### Bookings link

- [ ] Direct link to top package or contact form (with UTM).

---

## 4. Reviews — playbook

### Acquisition cadence

- **Target:** 12 new CO reviews / month (4 / week).
- **Process post-trip:**
  1. Day +1 (return): WhatsApp thank-you message from tour designer.
  2. Day +3: branded email with one-click GBP review link (`https://g.page/r/<id>/review`) + UTM `utm_source=email&utm_medium=email&utm_campaign=co_email_lifecycle_review_request_YYYYMM`.
  3. Day +7: gentle WA nudge if no review.
  4. Day +14: final ask, then stop.
- **Never** offer compensation in exchange (Google policy).
- Track ask→review conversion in `funnel_events` once shipped.

### Response template (5★ positive)

```
¡Hola {first_name}! 🇨🇴

Gracias por compartir tu experiencia con {destino}. Nos llena de orgullo haber sido parte de tu viaje y leer que {detalle_específico_de_la_review}.

Esperamos volver a planearte una nueva aventura por Colombia muy pronto.

— Equipo ColombiaTours.travel
```

### Response template (3★ — neutral / mixed)

```
Hola {first_name}, gracias por tu reseña honesta. Lamentamos que {aspecto_negativo_específico} no haya cumplido tus expectativas. Nos gustaría entender mejor lo sucedido — ¿podrías escribirnos a {email_ops}? Tu feedback nos ayuda a mejorar.

— Equipo ColombiaTours.travel
```

### Response template (1-2★ — negative)

```
Hola {first_name}, lamentamos profundamente que tu experiencia no haya sido la esperada. Tomamos muy en serio cada comentario. Ya iniciamos una revisión interna sobre {issue}. Por favor escríbenos a {email_ops} con el código de tu reserva para poder atender personalmente tu caso.

— Equipo ColombiaTours.travel
```

> **Always reply within 48h** to every review (positive, neutral, negative). Never argue publicly. Never reveal trip details or PII in the response.

### Flagging policy

Flag a review for removal **only** when it violates GBP policies (spam, off-topic, fake, hate, conflict of interest). Document reason in `docs/growth-sessions/`.

---

## 5. Citations — hygiene

Citations = third-party listings of NAP. Drive local rankings + brand trust.

### Tier 1 (must exist + be consistent)

- Google Business Profile
- Apple Maps Connect
- Bing Places
- Facebook Page
- Instagram Business
- TripAdvisor (Tour Operator)
- ANATO directory
- ProColombia directory
- Yelp (if active in market)

### Tier 2 (travel-specific)

- Lonely Planet listing
- Booking.com partner page (if package distribution active)
- GetYourGuide / Viator profile
- Local Cámara de Comercio listing
- Industry directories (IATA, ASATA, ANATO sub-listings)

### Tier 3 (local)

- City tourism boards (Bogotá, Cartagena, Medellín)
- Departmental tourism portals
- Local newspapers' business directories

### Quarterly audit process

1. Pull current NAP for each Tier 1 + Tier 2 listing into the [NAP source-of-truth table](#6-nap-consistency).
2. Diff against the canonical row.
3. For each mismatch, file fix request (vary by platform: dashboard edit, support ticket, claim flow).
4. Track fixes in a spreadsheet column `last_audited`, `discrepancy_found`, `fix_submitted`, `fix_confirmed`.

---

## 6. NAP consistency

The single source of truth — **never** improvise variants.

| Field | Canonical value (CO) |
|---|---|
| **Name** | `ColombiaTours.travel` |
| **Address line 1** | _<official street + number — confirm with Ops>_ |
| **City / State** | Bogotá, D.C. |
| **Postal code** | _<official>_ |
| **Country** | Colombia |
| **Phone (international)** | `+57 ___ ___ ____` |
| **Phone (local display)** | `(601) ___ ____` |
| **Website (canonical)** | `https://colombiatours.travel/` |
| **Email (public)** | `hola@colombiatours.travel` (or current canonical) |

> Any change must propagate to all Tier 1 + Tier 2 citations within 7 days. Owner: A5.

---

## 7. Photos / posts cadence

| Asset type | Cadence | Owner |
|---|---|---|
| New destination photos (≥ 5) | quarterly | Ops + A5 |
| GBP weekly post | weekly Mondays | A5 |
| GBP Offer post (when running paid promo) | per-promo | A5 |
| Q&A new entries | as needed (≥ 1/mo) | A5 |
| Video (≤ 30s) | quarterly | Ops |

> Tag every photo with destination keyword in filename (`cartagena-mural-2026.jpg`) before upload.

---

## 8. Reporting

Weekly council surfaces local SEO when:

- Review velocity drops > 30% vs trailing 4 weeks.
- Map-pack ranking for primary keyword falls > 3 positions.
- Any 1-star review posted.
- NAP discrepancy detected on a Tier 1 citation.

Monthly local SEO summary appended to `docs/growth-okrs/active.md` notes section.

---

## 9. Open questions

- Decide on MX physical/virtual presence by 2026-Q3.
- Confirm canonical NAP fields with Ops (placeholder rows above).
- Evaluate Apple Business Connect Showcase setup once iOS market data improves.
