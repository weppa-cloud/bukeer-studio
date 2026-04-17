# Dark Mode Behavior

Reference for QA, designers, and developers working with Bukeer Studio themes.

## TL;DR

- Dark-mode availability is driven by tenant data: `websites.theme.profile.colorMode`.
- The value is one of `'light' | 'dark' | 'system'` (default `'system'`).
- The Studio does **not** ship a user-facing dark/light toggle on public sites.
- Forcing `.dark` on `<html>` via DevTools does **not** switch the palette. This is by design; see below.

## Data flow

```
websites.theme.profile.colorMode (DB)
        │
        ▼
M3ThemeProvider  (lib/theme/m3-theme-provider.tsx)
  • selects isDark from colorMode (or matchMedia for 'system')
  • calls applyCompiledThemeToDOM(tokens, profile, isDark)
        │
        ├── applyCssVariables(modeVars, :root)   ← shadcn tokens (light OR dark)
        └── applyBridgeVariables(:root)           ← bridge vars (--bg-card, --text-heading, …)
        │
        ▼
NextThemesProvider  (attribute="class", enableSystem when colorMode='system')
  • writes .dark / removes it on <html>
        │
        ▼
ThemeBridgeSync listens to useNextTheme().resolvedTheme
  • re-runs applyCompiledThemeToDOM(tokens, profile, resolvedTheme === 'dark')
```

Key points:
- `applyCompiledThemeToDOM` writes inline styles (`root.style.setProperty`) on `:root` for BOTH
  the shadcn palette and the bridge variables (`--bg-card`, `--text-heading`, `--text-muted`,
  `--border-subtle`, `--card-badge-bg`, etc.).
- `applyBridgeVariables` derives bridge values from the shadcn HSL triplets using
  `getComputedStyle(root)`. Light and dark modes therefore produce different inline values.
- `ThemeBridgeSync` re-runs the full pipeline when `resolvedTheme` changes, so both
  shadcn AND bridge variables flip atomically.

## Why class-injection does NOT switch palettes

The public site uses **inline CSS variables** on `:root` (highest specificity). Tailwind
`dark:` selectors and `.dark { }` class rules are lower specificity than inline styles. If
you manually add `.dark` via DevTools:

1. next-themes is not notified (no `setTheme('dark')` call), so `resolvedTheme` stays the same.
2. `ThemeBridgeSync`'s `useEffect` does not re-run.
3. The old light-mode inline variables stay on `:root` and override everything.

This is the correct behaviour: the palette is data-driven, not class-driven.

## How to QA dark mode correctly

Do NOT toggle `document.documentElement.classList.add('dark')` in DevTools. Instead:

### Option A — via next-themes API in the browser console

```js
// Check current theme
window.__NEXT_DATA__ // for context; not needed to toggle
// Force dark
localStorage.setItem('theme', 'dark'); location.reload();
// Force light
localStorage.setItem('theme', 'light'); location.reload();
// Follow OS
localStorage.removeItem('theme'); location.reload();
```

`next-themes` uses the `theme` localStorage key by default. Reloading after setting it
ensures `NextThemesProvider` initialises with the requested mode.

### Option B — change tenant `colorMode` in Supabase (preferred for end-to-end QA)

Update the website's theme profile:

```sql
UPDATE websites
SET theme = jsonb_set(theme, '{profile,colorMode}', '"dark"'::jsonb)
WHERE subdomain = 'colombiatours-staging';
```

Then revalidate ISR (or wait 5 min) and reload. The site now serves dark mode by default
and `useNextTheme().resolvedTheme === 'dark'`.

### Option C — change OS preference (only works when `colorMode === 'system'`)

macOS: System Settings → Appearance → Dark. The site must have `colorMode: 'system'`
(most presets do). A hard reload may be needed.

## Configuring a tenant for dark-mode testing

`profile.colorMode` lives inside the theme JSONB on `websites.theme`.

| Goal                                   | `colorMode` value |
|----------------------------------------|-------------------|
| Always light                           | `'light'`         |
| Always dark                            | `'dark'`          |
| Follow the visitor's OS preference     | `'system'`        |

Preset defaults (see `packages/theme-sdk/src/presets/tourism-presets.ts`):
- `boutique` → `'light'`
- All others → `'system'`

To make a preset dark-only when seeding a new site, override
`profile.colorMode` after picking the preset.

## Toggle UI — follow-up (P3)

There is no user-facing dark/light toggle on the public site. Components for a toggle
exist in `themes/references/colombia-tours-boutique/` but are not wired into
`components/site/site-header.tsx`.

If a toggle becomes a product requirement:
1. Add a `<ThemeToggle />` button in `components/site/site-header.tsx`.
2. Use `useTheme()` from `next-themes` (`setTheme('dark' | 'light' | 'system')`).
3. Respect `profile.colorMode`:
   - If `'light'` or `'dark'` (hard-coded tenant preference), hide the toggle.
   - If `'system'`, show it.

Tracking note: dark-mode toggle UI is **P3** because most tenants pick a single
`colorMode` at design time and never need runtime switching.

## Files of record

- `lib/theme/m3-theme-provider.tsx` — provider, `applyCompiledThemeToDOM`, `applyBridgeVariables`, `ThemeBridgeSync`
- `packages/theme-sdk/src/compiler/css-generator.ts` — emits `light[]` and `dark[]` CSS variable arrays
- `packages/theme-sdk/src/presets/tourism-presets.ts` — per-preset default `colorMode`
- `components/studio/site-theme-scope.tsx` — Studio preview scope (mirrors the public provider logic)
- `app/site/[subdomain]/layout.tsx` — wires tenant theme into `M3ThemeProvider`
