# Reference Files

## Architecture & Patterns

| Document | Path | Use For |
|----------|------|---------|
| Architecture | `docs/architecture/ARCHITECTURE.md` | Overall architecture, principles P1-P10 |
| ADR Decisions | `docs/architecture/ADR-001` through `ADR-013` | All architectural decisions |
| Onboarding | `docs/architecture/ONBOARDING-ARCHITECTURE.md` | Developer onboarding guide |
| AI Agent Dev | `docs/architecture/AI-AGENT-DEVELOPMENT.md` | AI agent development patterns |

## Design System & Tokens

| Document | Path | Use For |
|----------|------|---------|
| Theme SDK | `packages/theme-sdk/src/` | Design tokens, compiler, presets, types |
| Website Contract | `packages/website-contract/src/` | Zod schemas, section types, shared types |
| M3ThemeProvider | `lib/theme/m3-theme-provider.tsx` | CSS Variable Bridge, runtime theme |
| shadcn/ui | `components/ui/` | Base UI primitives (button, card, dialog, etc.) |
| Global CSS | `app/globals.css` | Tailwind v4 tokens, CSS custom properties |

## Token Source Files

| Token | Source | Access Pattern |
|-------|--------|----------------|
| Colors | CSS Variables via M3ThemeProvider | `var(--primary)`, `var(--surface)`, etc. |
| Typography | Tailwind classes | `text-sm`, `text-lg`, `font-semibold`, etc. |
| Spacing | Tailwind classes | `p-4`, `gap-6`, `space-y-2`, etc. |
| Border Radius | Tailwind classes | `rounded-md`, `rounded-lg`, `rounded-xl`, etc. |
| Shadows | Tailwind classes | `shadow-sm`, `shadow-md`, `shadow-lg`, etc. |
| Animations | Framer Motion + Tailwind | `animate-*` classes, `motion` components |
| Theme Presets | `packages/theme-sdk/src/presets/` | 8 presets: adventure, luxury, tropical, etc. |

## Domain-Specific

| Document | Path | Use For |
|----------|------|---------|
| Section Registry | `lib/sections/` | Section types, renderer, normalization |
| Supabase Clients | `lib/supabase/` | Server/client/middleware client setup |
| AI Integration | `lib/ai/` | LLM provider config, prompt templates |
| Env Validation | `lib/env.ts` | Zod-validated environment variables |
| Studio Utils | `lib/studio/` | Studio-specific utilities |
| CODE Gate Script | `scripts/ai/validate-tech-validator.mjs` | Automated tech-validator CODE checks and report generation |
