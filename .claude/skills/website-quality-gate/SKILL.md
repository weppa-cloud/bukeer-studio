---
name: website-quality-gate
description: |
  Validates generated website sections and pages against performance, accessibility,
  and design compliance standards for Bukeer tourism websites.
  USE WHEN: website validation, "check the site", "run quality checks", "lighthouse audit",
  "accessibility check", after section generation, "is this page ready", website QA,
  "validate the homepage", "check performance".
  NOT FOR: generating sections (use website-section-generator), design decisions
  (use website-designer), Next.js features (use nextjs-developer).
context: fork
allowed-tools: mcp__playwright__browser_navigate, mcp__playwright__browser_take_screenshot,
  mcp__playwright__browser_snapshot, mcp__playwright__browser_resize,
  mcp__chrome-devtools__take_screenshot, mcp__chrome-devtools__navigate_page,
  mcp__chrome-devtools__evaluate_script, mcp__chrome-devtools__lighthouse_audit,
  mcp__chrome-devtools__list_console_messages,
  Bash(npx tsc*), Bash(npm run lint*), Bash(npm run build*),
  Read, Grep, Glob

  Examples:
  <example>
  Context: User wants to validate a generated homepage.
  user: "Run quality checks on the homepage we just built"
  assistant: "I'll use website-quality-gate to run Lighthouse, accessibility, and token compliance checks."
  <commentary>Quality validation requires website-quality-gate.</commentary>
  </example>
  <example>
  Context: User wants to check accessibility.
  user: "Is the hero section WCAG AA compliant?"
  assistant: "I'll use website-quality-gate to check contrast ratios, ARIA labels, and touch targets."
  <commentary>Accessibility validation uses website-quality-gate.</commentary>
  </example>
  <example>
  Context: User wants to generate a new section.
  user: "Create a testimonials section"
  assistant: "I'll use website-section-generator for code generation."
  <commentary>Code generation uses website-section-generator, not this skill.</commentary>
  </example>
---

# Website Quality Gate Skill

Validates Bukeer tourism websites against performance, accessibility, design compliance, and UX standards. Produces a pass/fail report with specific fix recommendations and delegations.

## Scope

**You Handle:**
- Static code analysis (bridge variable compliance, import hygiene, a11y lint)
- Lighthouse audit orchestration (performance, accessibility, best practices, SEO)
- WCAG AA validation (contrast, ARIA, touch targets, keyboard nav)
- Core Web Vitals checks (LCP, INP, CLS)
- Motion system validation (varied animations, reduced-motion support)
- Responsive verification (375px, 768px, 1440px)
- Bridge variable compliance (no raw Tailwind colors in showcase variants)
- Section variant validation (showcase sections use bridge vars)
- Card anatomy compliance (Airbnb/G Adventures patterns)
- Page flow testing (listing → detail click-through)
- Screenshot-driven UX audit

**Delegate To:**
- `website-section-generator`: Fix code issues found during validation
- `website-designer`: Fix design/token/variant issues
- `nextjs-developer`: Fix complex Next.js build/performance issues
- `testing-agent`: Add unit/integration tests

## Quality Thresholds

### Blocking (must pass)

| Category | Threshold |
|---|---|
| TypeScript | Zero errors in section files |
| Lighthouse Performance | >= 85 (travel sites are image-heavy) |
| Lighthouse Accessibility | >= 90 |
| Lighthouse Best Practices | >= 90 |
| Lighthouse SEO | >= 90 |
| LCP | <= 3.0s (image-heavy travel pages) |
| CLS | <= 0.1 |
| WCAG AA Contrast (body) | >= 4.5:1 |
| WCAG AA Contrast (large) | >= 3:1 |
| All images have alt text | 100% |
| Bridge variables in showcase | No raw Tailwind colors |
| Page transitions working | template.tsx AnimatePresence |
| Dark/Light toggle | Bridge vars recalculate |

### Warning (report but don't block)

| Category | Threshold |
|---|---|
| Bundle size (JS first load) | < 250KB |
| Animation variety | NOT all fadeUp |
| prefers-reduced-motion | All motion components handle |
| Card carousel on multi-image | CardCarousel used |
| Touch targets (mobile) | >= 44px |

## Execution Flow

### Phase 1: Static Code Analysis

```
CHECK 1 — Bridge Variable Compliance (showcase variants)
Grep for raw Tailwind colors in showcase variant functions:
  bg-[a-z]*-[0-9], text-[a-z]*-[0-9] in showcase functions
  Should find ZERO — showcase variants use style={{ color: 'var(--xxx)' }}

CHECK 2 — Import Hygiene
Verify NO imports from @aceternity or @magicui (they're NOT installed).
In-house components only: @/components/ui/number-ticker, blur-fade, etc.

CHECK 3 — Animation Variety
Count animation directions across section files:
  opacity: 0, y: 20  (fadeUp) — should NOT be >60% of entrances
  opacity: 0, x: -30 (slideLeft)
  opacity: 0, x: 40  (slideRight)
  opacity: 0, scale: 0.8 (scaleIn)
  BlurFade (blurEntrance)
If >60% are fadeUp → WARNING: monotonous motion

CHECK 4 — Section Registry Consistency
Every .tsx in components/site/sections/ must be registered in section-registry.tsx.

CHECK 5 — Content Schema Match
Section content types must match schemas in packages/website-contract/src/schemas/sections.ts.
```

### Phase 2: TypeScript + Build

```bash
cd web-public && npx tsc --noEmit 2>&1   # Zero errors required
cd web-public && npx next lint 2>&1       # Check for warnings
```

### Phase 3: Runtime — Lighthouse + Screenshots

If dev server running (check `lsof -i :3000 | grep LISTEN`):

```
# Lighthouse via Chrome DevTools MCP
mcp__chrome-devtools__lighthouse_audit

# Screenshots at key breakpoints (JPEG quality 15, 1024x768)
mcp__chrome-devtools__take_screenshot  # Desktop
mcp__chrome-devtools__resize_page      # 768px → screenshot
mcp__chrome-devtools__resize_page      # 375px → screenshot
```

**Screenshot optimization**: Use JPEG quality 15, viewport 1024x768, devicePixelRatio 1, save to file. Keeps images under 15KB.

### Phase 4: Page Flow Testing

Test every product type's click-through:

```
Homepage → Hotel card → Hotel detail page → Back
Homepage → Activity card → Activity detail page → Back
Homepage → Package card → Package detail page → Back
Listing page → Card → Detail → Lightbox → Back
```

Verify:
- Page transitions animate (opacity + y shift)
- Detail page loads with correct product data
- Gallery lightbox opens/closes
- Reviews section renders
- Similar products section renders
- Booking sidebar is sticky
- WhatsApp CTA has correct phone number

### Phase 5: Theme Toggle Test

```
1. Load homepage in light mode
2. Toggle to dark mode
3. Verify: bridge variables recalculate (ThemeBridgeSync)
4. Verify: all text remains readable
5. Verify: card badges maintain glassmorphism
6. Toggle back to light
7. Verify: no flash of wrong colors
```

### Phase 6: Card Anatomy Audit

For each card type visible on listing pages:

**Hotel cards** (showcase variant):
- [ ] 16:10 aspect ratio image (or CardCarousel if multiple)
- [ ] Star rating badge (glassmorphism, top-right)
- [ ] Hotel name (font-semibold)
- [ ] Location with pin icon
- [ ] Review rating inline (★ 4.9 (128))
- [ ] Price in accent color
- [ ] "Ver Hotel →" in mono font
- [ ] Hover: card lifts (y: -4), image scales (105%)

**Activity cards** (showcase variant):
- [ ] 3:4 aspect ratio with overlay gradient
- [ ] Category badge (glassmorphism)
- [ ] Difficulty badge (color-coded)
- [ ] Duration + group size meta row
- [ ] Rating + price bottom row
- [ ] Hover: image scales (110%)

**Package cards** (showcase variant):
- [ ] 16:10 image with gradient overlay
- [ ] Category badge (glassmorphism)
- [ ] Rating + review count (top-right of title)
- [ ] Destination + duration + group size meta
- [ ] Highlights checklist (max 3, green checks)
- [ ] Price in accent + "Ver Paquete →"

### Phase 7: Report

```markdown
# Website Quality Report — [Site Name]

## Summary
- **Status**: PASS / FAIL
- **Date**: [timestamp]
- **Theme**: [preset] / [colorMode]

## Scores
| Category | Score | Threshold | Status |
|---|---|---|---|
| TypeScript | [0 errors] | 0 | ✅/❌ |
| Lighthouse Perf | [score] | >= 85 | ✅/❌ |
| Lighthouse A11y | [score] | >= 90 | ✅/❌ |
| Bridge Compliance | [violations] | 0 | ✅/❌ |
| Animation Variety | [%fadeUp] | < 60% | ✅/⚠️ |

## Page Flow
| Flow | Status |
|------|--------|
| Home → Hotel → Detail → Back | ✅/❌ |
| Home → Activity → Detail → Back | ✅/❌ |
| Listing → Sort → Filter | ✅/❌ |
| Detail → Lightbox → Close | ✅/❌ |
| Theme toggle (light ↔ dark) | ✅/❌ |

## Card Anatomy
| Card Type | Rating | Badge | Price | Hover | Status |
|-----------|--------|-------|-------|-------|--------|
| Hotel | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ |
| Activity | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ |
| Package | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ | ✅/❌ |

## Issues
1. [BLOCKING] [description] → [file:line] → delegate to [skill]
2. [WARNING] [description] → [file:line] → delegate to [skill]

## Action Items
[Prioritized list]
```

## Failure Routing

| Issue Type | Route To |
|---|---|
| Performance (LCP, bundle) | `website-section-generator` (lazy-load) |
| Accessibility (ARIA, contrast) | `website-section-generator` (add labels) |
| Bridge variable violations | `website-section-generator` (replace Tailwind with var()) |
| Color palette contrast | `website-designer` (adjust tokens) |
| Build/TS errors | `nextjs-developer` |
| Missing section variant | `website-section-generator` |
| Card anatomy incomplete | `website-section-generator` |

**Max 2 iteration loops**, then escalate to human with full report.

## Critical Rules

**ALWAYS:**
- Run TypeScript check first (blocks everything)
- Verify bridge variable compliance in showcase variants
- Test dark/light toggle (ThemeBridgeSync)
- Check animation variety (not all fadeUp)
- Test page flow (listing → detail → back)
- Verify card anatomy per TRAVEL_UI_KIT.md
- Use JPEG quality 15 for screenshots (context-friendly)
- Include file:line references for all issues

**NEVER:**
- Skip accessibility checks
- Pass with Lighthouse accessibility < 90
- Ignore bridge variable violations in showcase variants
- Accept all-fadeUp animation (must vary)
- Mark PASS without testing theme toggle
- Block on warnings (only block on FAIL thresholds)
- Take PNG screenshots (too large — use JPEG quality 15)

## Testing Commands

```bash
cd web-public
npx tsc --noEmit              # TypeScript (blocking)
npx next lint                 # ESLint
npm run build                 # Production build + bundle
```

## Reference Docs

- `docs/04-design-system/TRAVEL_UI_KIT.md` — Card anatomies, motion catalog, patterns
- `web-public/lib/sections/section-registry.tsx` — 34 section types
- `web-public/lib/theme/m3-theme-provider.tsx` — Bridge variables
- `web-public/lib/motion-presets.ts` — Animation presets
- `packages/website-contract/src/schemas/sections.ts` — Content schemas
