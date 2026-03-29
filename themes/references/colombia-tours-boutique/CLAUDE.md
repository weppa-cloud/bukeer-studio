# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important

Read `AGENTS.md` before writing any Next.js code — this project uses **Next.js 16** which has breaking changes vs. earlier versions. Consult `node_modules/next/dist/docs/` for up-to-date API references.

## Commands

```bash
npm run dev     # Start dev server (http://localhost:3000)
npm run build   # Production build
npm run lint    # ESLint (flat config, eslint.config.mjs)
npm start       # Serve production build
```

All commands run from the `colombia-tours/` directory.

## Architecture

- **Framework**: Next.js 16 with App Router, React 19, TypeScript, Tailwind CSS v4
- **Language**: Spanish (es) — all UI text, metadata, and content is in Spanish

### Project Structure

- `src/app/` — App Router pages. Routes: `/` (home), `/hoteles`, `/actividades`, `/paquetes`, `/blog`, plus dynamic `[slug]` detail pages for each
- `src/components/` — All UI components (PascalCase, one per file). No component library — everything is custom
- `src/lib/utils.ts` — `cn()` helper (clsx + tailwind-merge)
- `src/lib/motion.ts` — Shared Framer Motion animation variants (`fadeUpVariants`, `staggerContainer`, `staggerItem`, `scaleIn`)
- `public/` — Static assets
- `audit/` — Design reference screenshots (not part of the build)

### Styling & Theming

- **Tailwind CSS v4** with `@theme` directive in `globals.css` — defines custom color palette (sand, jungle, stone), display font sizes, and animations
- **Dark/light theme** via CSS custom properties on `:root` / `:root.light`. Dark is default. Theme toggled by adding/removing `light` class on `<html>`
- Theme persistence uses `localStorage('theme')` with a blocking `<script>` in layout to prevent flash
- Inline `style={{ color: "var(--xxx)" }}` is used extensively for theme-aware colors that aren't in the Tailwind palette
- Custom fonts: DM Serif Display (headings), DM Sans (body), DM Mono (accents) — loaded via `next/font/google` with CSS variables

### Key Libraries

- **framer-motion** — Page animations, scroll-based header show/hide, stagger reveals, marquee effects
- **lucide-react** — Icons
- **clsx + tailwind-merge** — Conditional class composition via `cn()`

### Patterns

- Data is hardcoded in page files (no CMS or API); listing pages define arrays of typed objects inline
- Client components (`"use client"`) are used for interactive sections; the home page itself is a Server Component that composes client children
- `SiteHeader` and `SiteFooter` are repeated per page (not in layout)
- Path alias: `@/*` maps to `./src/*`
