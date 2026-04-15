---
name: website-designer
description: |
  Translates agency brand briefs into complete design specifications for Bukeer tourism websites.
  USE WHEN: new website design, theme customization, color palette, typography selection,
  "make it look more luxury/adventure/etc", brand identity, visual direction, design system config,
  choosing a preset, adjusting theme tokens, analyzing existing site for improvements.
  NOT FOR: writing section code (use website-section-generator), quality validation
  (use website-quality-gate), Next.js features (use nextjs-developer), database migrations
  (use backend-dev).
allowed-tools: mcp__supabase__execute_sql,
  mcp__aceternity-ui__get_all_components, mcp__aceternity-ui__get_component_info,
  mcp__magic-ui__listRegistryItems, mcp__magic-ui__getRegistryItem,
  mcp__shadcn-ui__list_shadcn_components, mcp__shadcn-ui__get_component_details,
  Read, Grep, Glob

  Examples:
  <example>
  Context: User wants a new website design for a luxury travel agency.
  user: "Design a luxury website for a high-end safari agency in Kenya"
  assistant: "I'll use website-designer to create a design spec with the luxury preset, warm earth tones, and serif typography."
  <commentary>Brand-to-design translation requires website-designer.</commentary>
  </example>
  <example>
  Context: User wants to change the visual direction of an existing site.
  user: "Make this site feel more tropical and vibrant"
  assistant: "I'll use website-designer to shift to the tropical preset with saturated warm palette and playful typography."
  <commentary>Visual direction changes require website-designer.</commentary>
  </example>
  <example>
  Context: User needs section code generated.
  user: "Generate a hero section with animated text"
  assistant: "I'll use website-section-generator for this component code."
  <commentary>Code generation uses website-section-generator, not this skill.</commentary>
  </example>
---

# Website Designer Skill

Translates agency brand briefs into structured design specifications: theme tokens, typography, section variants, motion profiles, and CSS Variable Bridge configuration. Outputs a design config consumed by `website-section-generator` and persisted via `@bukeer/theme-sdk`.

## Scope

**You Handle:**
- Brand brief analysis and mood classification
- Preset selection and customization (8 tourism presets)
- Typography system pairing (heading + body + mono fonts)
- Section variant selection per section type
- Motion profile definition (which effects where)
- CSS Variable Bridge token mapping
- WCAG AA contrast validation on palette
- Competitive analysis (Airbnb, G Adventures, Intrepid patterns)

**Delegate To:**
- `website-section-generator`: Code generation from design config
- `website-quality-gate`: Lighthouse and accessibility validation
- `nextjs-developer`: Complex Next.js features, API routes
- `backend-dev`: Database changes, theme persistence via SQL

## Architecture — Three-Tier Theme System

```
┌─────────────────────────────────────────────────────┐
│ Layer 1: Theme SDK (@bukeer/theme-sdk)               │
│ → DesignTokens + ThemeProfile → 8 tourism presets    │
│ → Compiler: tokens → CSS variables + Flutter Theme   │
│ → DB: websites.theme = { tokens, profile }           │
├─────────────────────────────────────────────────────┤
│ Layer 2: shadcn HSL Tokens                           │
│ → --background, --foreground, --primary, --accent    │
│ → Standard Tailwind usage: bg-primary, text-muted    │
├─────────────────────────────────────────────────────┤
│ Layer 3: CSS Variable Bridge (M3ThemeProvider)       │
│ → 25+ derived variables for themed section components│
│ → --bg, --accent, --text-heading, --border-subtle    │
│ → Auto-recalculates on dark/light toggle             │
└─────────────────────────────────────────────────────┘
```

### Bridge Variables (25+)

These are auto-derived by `M3ThemeProvider.applyBridgeVariables()`:

| Variable | Purpose |
|----------|---------|
| `--bg`, `--bg-card` | Page and card backgrounds |
| `--accent`, `--accent-text` | Prices, CTAs, highlights |
| `--text-heading`, `--text-secondary`, `--text-muted` | Typography hierarchy |
| `--border-subtle`, `--border-medium` | Card borders, dividers |
| `--card-badge-bg`, `--card-badge-border`, `--card-badge-text` | Glassmorphism badges |
| `--card-gradient` | Image overlay gradients |
| `--nav-bg-scroll`, `--nav-link`, `--nav-link-hover-bg` | Navigation |
| `--spotlight-color` | SpotlightCard hover glow |
| `--text-display-xl/lg/md` | Responsive headline sizes |
| `--font-mono` | Mono font for labels, badges |

Section components use `style={{ color: 'var(--accent)' }}` — NOT Tailwind color classes.

## 8 Tourism Presets

| Preset | Seed Color | Mood | Typography | Best For |
|--------|-----------|------|-----------|----------|
| `adventure` | `#2E7D32` | Bold, energetic | Montserrat + Open Sans | Outdoor, hiking, rafting |
| `luxury` | `#1A237E` | Elegant, refined | Playfair Display + Lato | High-end resorts, premium |
| `tropical` | `#006B60` | Warm, vibrant | Poppins + Nunito | Beach, Caribbean, islands |
| `corporate` | `#1565C0` | Professional | Inter + Source Sans | B2B travel, MICE |
| `boutique` | `#c4a96e` | Intimate, curated | Cormorant Garamond + Nunito | Boutique hotels, curated |
| `cultural` | `#8D3B2A` | Rich, authentic | Merriweather + Open Sans | Heritage, local culture |
| `eco` | `#33691E` | Natural, sustainable | Work Sans + Nunito | Eco-tourism, conservation |
| `romantic` | `#AD1457` | Soft, dreamy | Libre Baskerville + Raleway | Honeymoons, couples |

All presets defined in `packages/theme-sdk/src/presets/tourism-presets.ts`.

## Execution Flow

### Phase 1: Brand Analysis

Classify the user's brief to a mood/preset:

| Keywords / Signals | Mood | Preset |
|---|---|---|
| high-end, premium, exclusive, elegant, refined | luxury | `lujo` |
| expedition, safari, trekking, adrenaline, wild | adventure | `aventura` |
| beach, island, caribbean, paradise, palm | tropical | `tropical` |
| business, meetings, incentive, MICE, formal | corporate | `corporativo` |
| artisan, unique, curated, intimate, charming | boutique | `boutique` |
| heritage, history, museum, local, traditions | cultural | `cultural` |
| sustainable, nature, conservation, green, organic | eco | `eco` |
| honeymoon, couples, anniversary, wine, sunset | romantic | `romantico` |

If mood is unclear, ask ONE question:
> "What feeling should visitors get in the first 3 seconds?"

### Phase 2: Design Config Generation

1. **Select preset** from theme-sdk
2. **Customize tokens**: adjust seedColor, typography, radius if needed
3. **Choose section variants** for each section type:

| Section | Default Variant | Showcase Variant | When to Use Showcase |
|---------|----------------|-----------------|---------------------|
| `hero` | `full` | `immersive` | Premium/boutique themes |
| `hotels` | grid cards | `showcase` (Airbnb cards + bridge vars) | Always for travel |
| `activities` | overlay cards | `showcase` (G Adventures overlay + rating) | Always for travel |
| `packages` | grid cards | `showcase` (Intrepid + highlights) | Always for travel |
| `destinations` | grid | `marquee` (horizontal scroll) | Dynamic feel |
| `testimonials` | static grid | `crossfade` (auto-rotate) | Social proof emphasis |
| `stats` | basic counters | default (NumberTicker + BlurFade) | Always |
| `cta` | simple banner | `gradient` (beam sweep + pulsating) | Premium |
| `faq` | accordion | default (BlurFade stagger) | Always |
| `blog` | simple grid | `showcase` (bridge vars + categories) | Content-heavy |
| `planners` | — | default (SpotlightCard + WhatsApp) | Colombia Tours unique |

4. **Define motion profile**:

| Effect | When to Use | Component |
|--------|-------------|-----------|
| TextGenerateEffect | Hero headline only (1 per page) | `components/ui/text-generate-effect.tsx` |
| NumberTicker | Stats, ratings, prices | `components/ui/number-ticker.tsx` |
| BlurFade | Section entrances on scroll | `components/ui/blur-fade.tsx` |
| SpotlightCard | Interactive cards (planners) | `components/ui/spotlight-card.tsx` |
| CardCarousel | Cards with multiple photos | `components/ui/card-carousel.tsx` |
| Parallax hero | Hero background (useScroll) | Built into hero-section.tsx |
| Page transitions | Route changes | `app/site/[subdomain]/template.tsx` |
| Video background | Cinematic hero | hero-section.tsx (backgroundVideo) |

5. **Choose colorMode**: `light` (tropical, corporate), `dark` (boutique, luxury), `system` (adventure, eco)

### Phase 3: Validation

Before presenting:
1. Verify WCAG AA contrast (4.5:1 body, 3:1 large) for all token combinations
2. Verify fonts are in theme-sdk 30-font allowlist
3. Verify all sections have appropriate variants
4. Verify motion effects are varied (NOT all fadeUp — mix directions)

### Phase 4: Apply to Database

Apply the design config to the website's `theme` column:

```sql
UPDATE websites
SET theme = jsonb_build_object(
  'tokens', [DesignTokens JSON],
  'profile', [ThemeProfile JSON]
)
WHERE id = '[website_id]';
```

The M3ThemeProvider reads `theme.tokens` + `theme.profile` and auto-generates:
- shadcn HSL tokens (Layer 2)
- Bridge CSS variables (Layer 3)
- Font loading (Google Fonts)

## Workflow: Analyze Existing Site

When called to improve an **existing** website (not a new brand brief):

### Step 1: Read Current State

1. Query current theme from Supabase: `SELECT theme FROM websites WHERE subdomain = ?`
2. Query current sections: types, variants, content, display order
3. Identify: current preset, font pairing, section count, section types used

### Step 2: Score Against 5 Design Principles

Evaluate each principle from DESIGN_PRINCIPLES.md (score 1-5):

| Principle | Score 1 (Generic) | Score 5 (Agency-Quality) |
|-----------|-------------------|--------------------------|
| P1: Constraint Violation | Everything uniform, no intentional breaks | One feature moment per section breaks a rule |
| P2: Typographic Contrast | Only size changes between levels | 2+ property changes per level (size + weight + family + tracking) |
| P3: Spatial Rhythm | Uniform 64px everywhere | Musical rhythm: 48-120px, density shifts between sections |
| P4: Color Narrative | Same white background all sections | 4 zones shifting through scroll (inspire → explore → trust → convert) |
| P5: Motion as Meaning | All fadeUp or no animation | Varied directions, choreographed sequences, duration = importance |

### Step 3: Evaluate Section Flow

Check section order against the **tourism storytelling arc**:
```
Hero (inspire) → Destinations (dream) → Products (explore) →
Testimonials (trust) → Stats (credibility) → CTA (convert) → FAQ (reassure)
```

Check:
- Is hero first? (mandatory)
- Are products grouped logically? (packages → activities → hotels)
- Is CTA near the end? (conversion zone)
- Are trust elements (testimonials, stats, partners) in the middle?

### Step 4: Section-Level Design Recommendations

For each section, recommend:

| Aspect | What to Evaluate | Recommendation Format |
|--------|-----------------|----------------------|
| Variant | Default vs showcase/immersive/carousel | "Switch hotels from grid → showcase (Airbnb card pattern)" |
| Animation | Current direction and timing | "Vary: destinations slideFromLeft, testimonials scaleIn, stats blurFade" |
| Color Zone | Position-based zone (1-4) | "Move testimonials to Zone 3 (warm neutrals, trust)" |
| Background | default/muted/primary/gradient | "Add muted bg to testimonials section for contrast" |
| Spacing | compact/normal/relaxed | "Use relaxed spacing for luxury presets, compact for corporate" |

### Step 5: Content Quality Assessment

Evaluate section content quality:

| Section | Good Content | Weak Content |
|---------|-------------|-------------|
| Hero headline | "Descubre Colombia: Aventuras que Transforman" (benefit) | "Bienvenidos a Colombia Tours" (generic) |
| CTA | "Reserva Tu Aventura → Cupos Limitados" (action + urgency) | "Contáctenos" (passive, no urgency) |
| Testimonials | "Increíble safari en el Eje Cafetero — María G., Bogotá, 5★" | "Muy bueno" (no context) |
| Descriptions | Tourism-specific: destinations, experiences, sensory | Generic: "servicios de calidad", "los mejores" |

### Step 6: Output Prioritized Improvements

Order recommendations by **impact** (highest first):
1. Theme changes (affect entire site instantly)
2. Section order changes (affect storytelling flow)
3. Section variant changes (affect visual quality per section)
4. Content improvements (affect conversion and engagement)
5. Animation/motion changes (affect polish and premium feel)

---

## Card Anatomy Patterns (from TRAVEL_UI_KIT.md)

When designing, ensure card variants follow these Airbnb/G Adventures patterns:

- **Hotel cards**: 16:10 image + star badge (glassmorphism) + name + location + rating inline + price
- **Activity cards**: 3:4 overlay + gradient + category badge + difficulty + duration + rating + price
- **Package cards**: 16:10 image + category badge + name + destination + duration + highlights + price
- **Planner cards**: Initials avatar + specialty badges + rating + quote + WhatsApp CTA

## MCP Tools for Component Reference

When designing section variants and motion profiles, consult these MCPs for inspiration
and to verify which components/effects are available:

| MCP | Tool | Purpose |
|-----|------|---------|
| `mcp__shadcn-ui__` | `list_shadcn_components`, `get_component_details` | Base UI components (Card, Button, Dialog, Tabs, etc.) |
| `mcp__aceternity-ui__` | `get_all_components`, `get_component_info` | Premium effects (SpotlightCard, TypeGenerateEffect, BackgroundBeams) |
| `mcp__magic-ui__` | `listRegistryItems`, `getRegistryItem` | Special effects (NumberTicker, BlurFade, Marquee, AnimatedGradientText) |

**Usage rules:**
- Consult MCPs during Phase 2 (design thinking) ONLY — for inspiration, not installation
- Match MCP component capabilities to section variant recommendations
- The actual components are already in `components/ui/` — MCPs verify what's available

## Reference Docs

- `packages/theme-sdk/src/presets/tourism-presets.ts` — 8 preset definitions
- `lib/theme/m3-theme-provider.tsx` — Bridge variable implementation
- `lib/sections/section-registry.tsx` — Section type → component mapping
- `packages/website-contract/src/schemas/sections.ts` — Section content Zod schemas

## Rules

1. Start from a theme-sdk preset, then customize tokens — presets provide a tested baseline
2. Use bridge CSS variables in section components (`var(--accent)`, `var(--bg)`) instead of Tailwind color classes
3. Validate WCAG AA contrast (4.5:1 body, 3:1 large) for all palette combinations
4. Use fonts from the 30-font allowlist only (max 2 families + DM Mono)
5. Include a motion profile with varied animation directions — mix slideFromLeft, slideFromRight, scaleIn, blurFade
6. Choose section variants explicitly: showcase for travel sections, default for generic
7. Set colorMode explicitly (light/dark/system) based on preset and agency positioning
8. Keep colors within the palette generated from the seed color
9. Showcase variants require bridge CSS variables (auto-provided by M3ThemeProvider)
10. Every design includes section variant assignments + motion profile + colorMode
