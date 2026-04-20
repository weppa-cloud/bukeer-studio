# Paso 5 — W7-c screencasts (AC-W7-3)

**Owner**: QA-lead (Loom recording)
**Prereq**: UI freeze (post Flow 1 walkthrough OK, data fill stable)
**Estimated**: 2h recording + edit
**Closes**: #221 AC-W7-3

## Goal

5 videos Loom ≤ 5 min cada uno. Walkthrough partner/support-facing. Linkear en training doc.

## Tools

- **Loom** (web Chrome extension o desktop app) — primary
- **Drive mirror** — backup link (enterprise req)
- Screen: 1440×900 desktop profile (browser ventana maxi)
- Audio: mic clear, ES-CO native speaker
- Cursor: highlight on (Loom setting)

## Videos (5)

### Video 1 — Flow 4a: Transcreate packages

**Duración target**: 4-5 min
**Ruta Studio**: `/dashboard/{websiteId}/translations`

Script:
1. Intro 15s: "Traducción de paquetes para ColombiaTours"
2. Login partner → dashboard translations
3. Picker content type: packages
4. Seleccionar Pkg 15D
5. Click "Translate with AI" → observar stream progress
6. Open draft editor → review diff es-CO ↔ en-US
7. Corrección manual ≥1 (ej. tone adjust)
8. Transition draft → reviewed
9. Transition reviewed → applied
10. Verify public `/en/paquetes/paquete-vacaciones-familiares-por-colombia-15-d-as` → EN renderizado
11. Outro 10s: "Revisar badges status dashboard + re-publish si source cambia"

**Expected testids visibles**: `translations-dashboard-kpi-*`, `translations-dashboard-row-*`, `translations-editor-apply`

### Video 2 — Flow 4b: Transcreate activities

Mismo flow Video 1 pero content type = activities, pick = Guatape.

Key callout: "Activities ahora editable en Studio — W2 2026-04-20 shipped" (ref ADR-025).

### Video 3 — Flow 4c: Transcreate blog

Mismo flow pero content type = blog_posts. Ref: `/blog/{slug}` + `/en/blog/{slug}`.

Note: si blog EN route aún no renderiza (W5 transcreate pendiente), mostrar como "coming soon — post-cutover W5 ships full EN blog".

### Video 4 — Flow 6: Activity Studio editor (Variant A)

**Ruta**: `/dashboard/{websiteId}/products/tour-a-guatape-y-pe-ol/{marketing,content}`

Script:
1. Intro 15s: "Edit activity marketing + content — native Studio editor"
2. Navigate marketing route
3. Edit `DescriptionEditor` → type change → save → "Guardado" indicator
4. Edit `HighlightsEditor` → add/remove bullet → save
5. Show `InclusionsExclusionsEditor` + `GalleryCurator`
6. Navigate content route
7. Show `HeroOverrideEditor` → change title/subtitle → save
8. Show `SectionsReorderEditor` → drag section → save
9. Preview public `/actividades/tour-a-guatape-y-pe-ol` — changes live
10. Outro 10s: "Flag studio_editor_v2 enabled = todos editors Studio-owned"

**Callout ADR-025**: "Activities + packages = Studio editable; hotels = Flutter-owner"

### Video 5 — Flow 7: Hotel Flutter handoff (Variant B)

**Ruta**: `/dashboard/{websiteId}/products/{hotel-slug}/...`

Script:
1. Intro 15s: "Hotels — Flutter-owner (no Studio editor pilot)"
2. Navigate hotel detail in Studio → read-only view
3. Click editor → "Edit in Flutter admin" message
4. Switch to Flutter admin app screen
5. Demonstrate hotel marketing edit in Flutter
6. Save in Flutter → return Studio → changes reflect (render only)
7. SEO meta editable vía SEO item detail en Studio
8. Outro 10s: "Boundary policy: Flutter catalog source of truth"

## Post-recording

1. Loom → share link (enterprise)
2. Mirror to Google Drive shared folder `Bukeer/pilot-colombiatours/training/`
3. Linkear en `docs/training/colombiatours-onboarding.md` cada flow:

```markdown
### Flow 4a — Packages translation
[Loom walkthrough](https://loom.com/share/...) · [Drive mirror](https://drive.google.com/...)
```

4. Replace `{{screenshot-placeholder}}` markers en `colombiatours-onboarding.md` con frames clave del video (screenshot at 00:15 / 01:30 / 03:00)

## Close #221

```bash
gh issue close 221 --comment "W7-c shipped: 5 Loom screencasts + Drive mirror + training doc updated with embed links. Flows 4a/4b/4c/6/7 covered. AC-W7-3 ✅. Closes W7 + contributes to #214 EPIC close path."
```

## Optional — Flow 8 (SEO transcreate deep-dive)

Si queda tiempo: Video 6 (5 min) cubriendo Flow 8 SEO transcreate mechanics — `seo_localized_variants` lifecycle, drift detection, bulk apply. Non-blocking.
