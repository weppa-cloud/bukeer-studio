# Website Creation Workflow — From Zero to Professional Site

> Step-by-step guide for creating and refining Bukeer tourism websites using Claude Code skills and commands.

Last updated: 2026-04-15

---

## Overview

Creating a professional tourism website involves **4 sessions** across **2 roles**:

| Session | Role | Purpose | Frequency |
|---------|------|---------|-----------|
| 1. Platform Verification | Rol 1 (Studio Developer) | Ensure components render at professional level | Once (benefits all sites) |
| 2. Site Creation | Rol 2 (Website Creator) | Create theme + sections + content via Supabase | Per client |
| 3. Visual Refinement | Rol 1 (Studio Developer) | Fix components that don't meet quality bar | Only if needed |
| 4. QA Validation | Rol 2 (Website Creator) | Lighthouse, WCAG, responsive, user flows | Per client |

### Architecture: Two Layers

```
LAYER 1: DATA (Rol 2)
  Theme tokens + section content + config
  Tools: /design-session, /website-creator
  Modifies: Supabase only

LAYER 2: CODE (Rol 1)
  React components + CSS + bridge variables
  Tools: website-section-generator, nextjs-developer, debugger
  Modifies: .tsx, .ts files
```

The data layer controls **what** appears (colors, fonts, content, section order). The code layer controls **how** it renders (card anatomy, animations, hover effects, responsive behavior).

---

## Session 1: Platform Verification (Rol 1)

**Goal:** Verify that all section components render at agency-quality level before creating any new site.

### Prompt

```
Revisa el sitio colombiatours.travel — toma screenshot de cada
sección del home y evalúa cada componente contra los patrones
de card anatomy en el skill website-designer (Airbnb cards para
hotels, G Adventures para activities, Intrepid para packages).
Lista los gaps visuales que encuentres.
```

### What Claude Code Does

1. **debugger** skill activates (keywords: "revisa", "evalúa", "gaps")
2. Navigates to the reference site via Chrome DevTools or Playwright
3. Screenshots each section
4. Compares against card anatomy patterns:
   - Hotels: 16:10 image + glassmorphism star badge + price
   - Activities: 3:4 overlay + gradient + difficulty badge + duration
   - Packages: 16:10 + category badge + highlights
   - Planners: SpotlightCard + initials avatar + WhatsApp CTA
5. Lists gaps

### If Gaps Found

```
Corrige los gaps que listaste en los componentes .tsx
```

**Skills activated:**
- `website-section-generator` — modifies component `.tsx` files
- `tech-validator MODE:CODE` — verifies bridge variables, build passes
- Commit when done

### Expected Output

A list of component fixes with before/after screenshots. After this session, the platform components are at professional level for all future sites.

---

## Session 2: Site Creation (Rol 2)

**Goal:** Create a complete website with theme, sections, and content.

### Prompt

```
/design-session [subdomain]

[Client brief — include:]
- Company name and industry focus
- Target audience (age, profile, interests)
- Destinations or products they offer
- Desired mood (luxury, adventure, tropical, etc.)
- Any specific requirements (video hero, blog, WhatsApp)
```

### Example

```
/design-session ecuadorwild

Nuevo cliente: EcuadorWild — turismo de aventura en Ecuador.
Trekking en volcanes, selva amazónica, rafting, birdwatching.
Target: viajeros jóvenes 25-40, aventureros internacionales.
Crea sitio completo: theme + todas las secciones + contenido.
```

### What Claude Code Does

1. `/design-session` command loads (all MCP tools pre-approved via `allowed-tools`)
2. **Phase 0:** Parses intent → CHANGE TYPE = FULL, target = new site
3. **Phase 2:** `website-designer` skill activates:
   - Matches mood to preset (aventura → `adventure`)
   - Selects tokens: seedColor, fonts, motion, spacing
   - Plans section order following tourism storytelling arc
   - Consults Aceternity/Magic UI MCPs for variant inspiration
   - Presents **Change Plan** for approval
4. **Phase 3:** Executes via `mcp__supabase__execute_sql`:
   - INSERT website record with theme `{ tokens, profile }`
   - INSERT 9-11 sections with Zod-validated content
5. **Phase 4:** Screenshots the rendered site, presents for review

### Iteration Prompts

After seeing the result:

```
Los stats necesitan más contraste, ponles fondo primary.
El hero CTA debería decir "Reserva tu expedición →"
```

```
Cambia el preset a tropical, quiero colores más cálidos
```

```
Agrega una sección de testimonials después de about
```

```
Reordena: pon about antes de stats
```

When satisfied:

```
Valida con Lighthouse y WCAG
```

### What Can Be Changed in This Session

| Aspect | Example Prompt |
|--------|---------------|
| Theme preset | "Cambia a luxury" |
| Colors | "Quiero tonos más cálidos" |
| Fonts | "Usa tipografía serif para los títulos" |
| Section order | "Pon testimonials después del hero" |
| Section add | "Agrega una sección de FAQ" |
| Section remove | "Quita la sección de blog" |
| Section variant | "Usa carousel para testimonials" |
| Content | "El headline del hero debería decir X" |
| Background | "Pon fondo oscuro en stats" |
| Spacing | "Más espacio en la sección about" |

### What Cannot Be Changed (Requires Session 3)

- How a card component renders (HTML/CSS structure)
- Animation effects in the component code
- New section types not in the registry
- Bridge CSS variables missing from M3ThemeProvider

---

## Session 3: Visual Refinement (Rol 1)

**Goal:** Fix components that don't render at the quality level the design promised. Only needed when Session 2 screenshots reveal component-level issues.

### When to Use

After Session 2, if a section looks wrong despite correct theme/data:

- Cards look generic (no hover effects, wrong aspect ratio)
- Animations are all the same (uniform fadeUp)
- A section type is missing from the registry
- Bridge variables are missing for a new design need

### Prompt

```
En el sitio [subdomain] la sección [section_type] se ve genérica.
Quiero [describe the desired visual pattern].
Mejora el componente.
```

### Example

```
En ecuadorwild la sección activities se ve genérica. Quiero
cards estilo G Adventures: overlay 3:4, difficulty badge con
glassmorphism, duration chip, hover scale. Mejora el componente.
```

### What Claude Code Does

1. `website-section-generator` activates
2. Reads current component: `components/site/sections/activities-section.tsx`
3. Consults MCPs:
   - Aceternity → focus-cards, animated-tooltip
   - Magic UI → blur-fade, number-ticker
   - shadcn → card, badge variants
4. Modifies the `.tsx` file with improvements
5. `tech-validator MODE:CODE` verifies:
   - Uses bridge CSS variables (`var(--accent)`, not hardcoded colors)
   - Build passes (`npx tsc --noEmit`, `npm run build`)
   - No hardcoded section types
6. Screenshots before/after

### Commit

```
commit
```

---

## Session 4: QA Validation (Rol 2)

**Goal:** Final quality validation before the site goes live.

### Prompt

```
/qa-nextjs [subdomain]
```

### What Claude Code Does

1. `qa-nextjs` command loads with Playwright + Chrome DevTools pre-approved
2. Tests user flows with persona "Diana" (Elementor power user):
   - **L1:** First impressions — does it look professional?
   - **L2:** Basic interactions — do CTAs, links, forms work?
   - **L3:** Section management — does scroll, navigation work?
3. Scores each story on 4 dimensions (functional, visual, responsive, UX)
4. Reports issues with screenshots
5. Terminates when all L1-L3 stories score >= 80

### Additional Validation

```
Corre Lighthouse audit en [subdomain] y verifica WCAG AA
```

---

## Quick Reference: Prompts by Task

### Theme Changes (Rol 2)

```
/design-session [subdomain]
Quiero que el sitio se vea más [luxury/tropical/adventure/corporate].
```

```
/design-session [subdomain]
Cambia los colores a tonos [cálidos/fríos/earth/pasteles].
Cambia la tipografía a [serif/sans/moderna].
```

### Section Changes (Rol 2)

```
/design-session [subdomain]
Agrega una sección de [testimonials/faq/blog/stats] después de [section].
```

```
/design-session [subdomain]
Reordena las secciones: pon [section] antes de [section].
```

```
/design-session [subdomain]
El CTA debería decir "[new text]" con más urgencia.
```

### Component Improvements (Rol 1)

```
La sección [type] en [subdomain] se ve genérica.
Mejora el componente con [describe pattern].
```

```
Revisa todos los componentes de secciones contra los patrones
de TRAVEL_UI_KIT.md. Lista y corrige los gaps.
```

### Full QA (Rol 2)

```
/qa-nextjs [subdomain]
```

---

## Troubleshooting

| Problem | Cause | Solution |
|---------|-------|----------|
| Theme changes don't show | ISR cache | Reload after 2-3 seconds, or trigger revalidation |
| Section not rendering | Section type not in registry | Escalate to Rol 1 — `website-section-generator` creates it |
| Colors look wrong | Bridge variables not recalculating | Check M3ThemeProvider in browser DevTools |
| Component crash | Content schema mismatch | Check Zod schema in `@bukeer/website-contract` |
| Lighthouse < 85 | Large images, no lazy loading | Data fix (compress images) or Rol 1 fix (add lazy loading) |

---

## Related Documentation

- [Architecture Overview](../architecture/ARCHITECTURE.md)
- [AI Agent Development Guide](../architecture/AI-AGENT-DEVELOPMENT.md)
- [Theme SDK Presets](../../packages/theme-sdk/src/presets/tourism-presets.ts)
- [Section Registry](../../lib/sections/section-registry.tsx)
- [Design Principles](../../.claude/skills/website-designer/DESIGN_PRINCIPLES.md)
