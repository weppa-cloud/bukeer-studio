# @bukeer/theme-sdk

Theme Platform v3 — canonical design tokens, theme profiles, and compiler for Bukeer websites.

## Quick Start

```typescript
import { parseTheme, validateTheme, compileTheme, previewTheme } from '@bukeer/theme-sdk';

// 1. Parse raw JSON input
const parsed = parseTheme(rawInput);
if (!parsed.success) throw new Error(parsed.errors.map(e => e.message).join(', '));

// 2. Validate accessibility + font policy + lint
const validation = validateTheme(parsed.tokens, parsed.profile);
if (!validation.valid) console.warn('Issues:', validation.issues);

// 3. Compile to runtime output (CSS vars for web, ThemeData for Flutter)
const compiled = compileTheme(parsed.tokens, parsed.profile, { target: 'web' });

// 4. Generate preview for UI cards
const preview = previewTheme(parsed.tokens, parsed.profile);
```

## Contracts

### DesignTokens (`$schema: "3.0.0"`)

| Category | Fields |
|----------|--------|
| **Colors** | `seedColor`, `light` (29 M3 roles), `dark` (29 M3 roles) |
| **Typography** | `display` (family, fallback, weight), `body`, `scale`, `bodyLineHeight`, `letterSpacing` |
| **Shape** | `radius` (none/xs/sm/md/lg/xl/full), `buttonRadius`, `cardRadius` |
| **Elevation** | `cardElevation`, `navElevation`, `heroElevation` (flat/subtle/raised/dramatic) |
| **Motion** | `preset` (none/subtle/moderate/expressive), `durationMs`, `easing`, `reducedMotion` |
| **Spacing** | `baseUnit` (4-12px), `scale`, `sectionPaddingMultiplier` |

### ThemeProfile (`$schema: "3.0.0"`)

| Field | Values |
|-------|--------|
| **Brand mood** | adventure, luxury, tropical, corporate, boutique, cultural, eco, romantic |
| **Layout variant** | modern, classic, minimal, bold |
| **Hero style** | full, split, centered, minimal, video, slideshow |
| **Nav style** | sticky, static, transparent, hidden |
| **Footer style** | full, compact, minimal |
| **Section styles** | Per-section intents: default, emphasized, inverted, subtle, hero, card-grid, alternating |
| **Color mode** | light, dark, system |

## Compiler Outputs

### Web (CSS Variables)

`compileTheme(tokens, profile, { target: 'web' })` generates:

- Light mode CSS vars (`--md-sys-color-primary`, etc.)
- Dark mode CSS vars
- Invariant vars (typography, spacing, shape, motion)
- Data attributes (`data-layout-variant`, `data-hero-style`, etc.)
- Google Fonts import URLs
- Semantic shadcn/UI mappings (background, foreground, card, primary, etc.)

### Flutter (ThemeData)

`compileTheme(tokens, profile, { target: 'flutter' })` generates:

- Light/dark `ColorScheme` (29 colors each)
- `TextTheme` (display + body family/weight)
- Shape (border radius mapping)
- Seed color for dynamic theming
- `useMaterial3: true`

## Guardrails

### Accessibility
- 11 critical color pairs checked (primary, secondary, tertiary, error, surface, inverse)
- WCAG AA minimum: 4.5:1 normal text, 3:1 large text
- Light + dark mode validation

### Font Policy
- 30-font allowlist: Inter, Montserrat, Playfair Display, Poppins, Lato, etc.
- Fallback validation: must use standard CSS generics
- Categories: sans-serif (13), serif (8), display (4), monospace (2)

### Lint Rules
- Bold layout + flat elevation = warning
- Minimal layout + dramatic elevation = warning
- Identical light/dark background = error
- Full radius globally = warning
- 8 rules total with error/warning/info severity

## Presets

8 tourism-ready presets included:

| Preset | Mood | Seed Color | Layout | Fonts |
|--------|------|-----------|--------|-------|
| Aventura | adventurous | `#2E7D32` | bold | Montserrat / Open Sans |
| Lujo | luxurious | `#1A237E` | classic | Playfair Display / Lato |
| Tropical | tropical | `#006B60` | modern | Poppins / Nunito |
| Corporativo | corporate | `#455A64` | minimal | Inter / Inter |
| Boutique | boutique | `#8D6E63` | classic | Cormorant Garamond / Lato |
| Cultural | cultural | `#880E4F` | modern | DM Serif Display / DM Sans |
| Eco | eco | `#33691E` | modern | Sora / Nunito |
| Romantico | romantic | `#AD1457` | classic | Playfair Display / Raleway |

```typescript
import { TOURISM_PRESETS, getPresetBySlug } from '@bukeer/theme-sdk';

const tropical = getPresetBySlug('tropical');
const compiled = compileTheme(tropical.tokens, tropical.profile, { target: 'web' });
```

## Package Structure

```
src/
├── contracts/          # Zod schemas + TypeScript types
│   ├── design-tokens.ts
│   ├── theme-profile.ts
│   ├── runtime-output.ts
│   └── preset.ts
├── sdk/                # Core functions
│   ├── parse.ts
│   ├── validate.ts
│   ├── compile.ts
│   ├── preview.ts
│   └── theme-sdk.test.ts
├── compiler/           # Output generators
│   ├── css-generator.ts
│   ├── flutter-generator.ts
│   └── snapshot.ts
├── guardrails/         # Validation rules
│   ├── accessibility.ts
│   ├── font-policy.ts
│   └── lint.ts
├── presets/
│   └── tourism-presets.ts
├── index.ts
└── version.ts
```

## Scripts

```bash
npm run build       # TypeScript compile
npm run typecheck   # Type validation only
npm run test        # Run test suite (18+ cases)
```
