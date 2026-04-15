# Debugger — Error Pattern Catalogue

Common error patterns specific to the Bukeer Studio stack (Next.js 15 + Supabase + Cloudflare Workers).

---

## Supabase Patterns

| Pattern | Symptom | Typical Root Cause | Diagnosis |
|---------|---------|-------------------|-----------|
| Silent null | Section renders empty, no error | RLS policy denies access → returns `[]` not error | Check `mcp__supabase__execute_sql` with service role vs anon key. Compare row counts. |
| Auth expired | 401 in API routes or console | SSR token not refreshed in middleware | Check `middleware.ts` → `updateSession()` call. Verify cookie flow. |
| Schema mismatch | Runtime Zod validation error | DB column renamed/added but Zod schema not updated | Compare `@bukeer/website-contract` schema with actual DB table via `list_tables`. |
| Missing join | Partial data renders | `.select('*')` doesn't include related table | Check if `.select('*, related_table(*)')` is needed. |
| Stale cache | Old data after update | ISR cache not revalidated | Check `revalidatePath()` or `revalidateTag()` call after mutation. |

## Next.js / React Patterns

| Pattern | Symptom | Typical Root Cause | Diagnosis |
|---------|---------|-------------------|-----------|
| Hydration mismatch | Console warning + flickering UI | `Date.now()`, `Math.random()`, or `window` access in RSC | Grep for `Date.now\|Math.random\|typeof window` in server components. |
| RSC boundary violation | "Cannot use useState in Server Component" | Missing `'use client'` directive | Check if file uses hooks but lacks `'use client'` at top. |
| Missing Suspense | Blank page during data fetch | Async server component without Suspense boundary | Wrap async component in `<Suspense fallback={...}>`. |
| Stale closure | Event handler uses old state | State captured in closure, not updated | Check if callback depends on stale ref or state variable. |
| Import cycle | Build fails with cryptic error | Circular import between components | Run `npx madge --circular` or trace import chain manually. |
| Dynamic import fail | Component doesn't render | `next/dynamic` with SSR disabled but component needs SSR data | Check `ssr: false` flag and whether component needs server data. |

## Theme / CSS Patterns

| Pattern | Symptom | Typical Root Cause | Diagnosis |
|---------|---------|-------------------|-----------|
| Generic colors | Site looks unstyled / default colors | Theme tokens not loaded → CSS vars undefined | Inspect element → check if `var(--primary)` has a value. Check M3ThemeProvider wrapping. |
| Bridge vars undefined | CSS variables show as empty | M3ThemeProvider not in the render tree | Check `app/site/[subdomain]/layout.tsx` → is M3ThemeProvider wrapping children? |
| Wrong preset | Site has wrong color palette | Theme preset mismatch between DB and compiler | Check `websites.theme.profile.preset` in DB. Verify `compileTheme()` input. |
| Dark mode broken | Dark mode shows wrong colors | `dark:` prefix classes missing or overridden | Check if component uses `dark:` variants and `next-themes` is configured. |
| Tailwind purge | Styles missing in production | Dynamic class names purged by Tailwind | Check for string interpolation in class names (e.g., `` `text-${color}` `` — breaks purge). |

## Section Patterns

| Pattern | Symptom | Typical Root Cause | Diagnosis |
|---------|---------|-------------------|-----------|
| Not rendering | Empty space where section should be | `section_type` not registered in `lib/sections/section-registry.tsx` | Grep registry file for the section type. Check spelling and casing. |
| Content malformed | Props undefined / missing fields | Normalization alias missing in `normalizeContent()` | Check if content field names match expected schema. Check normalization function. |
| Wrong variant | Section renders but looks wrong | `variant` field not passed or not handled | Check component's variant prop handling and default value. |
| Image broken | Section renders but images are 404 | Supabase storage URL changed or bucket policy | Check image URLs in section content. Verify bucket public access. |
| Animation janky | Framer Motion animations stutter | Heavy re-renders during animation | Check if parent component re-renders (React DevTools profiler). Use `useMemo` if needed. |

## Cloudflare / Edge Patterns

| Pattern | Symptom | Typical Root Cause | Diagnosis |
|---------|---------|-------------------|-----------|
| Build fail | Worker bundle exceeded limit | Heavy import without `next/dynamic` | Check bundle with `npm run build:worker`. Look for large dependencies. |
| Node API error | "X is not a function" in edge runtime | Using Node-only API (`fs`, `path`, `crypto`) | Grep for Node imports. Replace with Web API equivalents. |
| Cold start timeout | First request after deploy is slow/fails | Worker initialization too heavy | Check middleware and root layout for heavy computation. |
| Environment var missing | `undefined` at runtime | `.dev.vars` missing variable or wrong key name | Compare `.dev.vars` with `lib/env.ts` Zod schema. |

## Zod / Contract Patterns

| Pattern | Symptom | Typical Root Cause | Diagnosis |
|---------|---------|-------------------|-----------|
| Schema drift | Validation fails at runtime | DB schema evolved but Zod schema in contract package not updated | Compare DB columns with `@bukeer/website-contract` schema definition. |
| Optional vs required | Unexpected null/undefined | Field is optional in DB but required in Zod (or vice versa) | Check `.optional()` / `.nullable()` in schema vs DB column constraint. |
| Enum mismatch | Invalid enum value error | New value added to DB enum but not to Zod `.enum()` | Check DB enum values vs Zod enum definition. |
| Transform error | Data shape wrong after parse | Zod `.transform()` produces unexpected output | Test schema parse with sample data. Check transform function logic. |
