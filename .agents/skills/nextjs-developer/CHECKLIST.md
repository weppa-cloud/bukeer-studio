# Pre-commit Checklist — Next.js Developer

## Before every PR

- [ ] `npm run typecheck` passes (zero errors)
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds (or `npm run build:worker` for Cloudflare)
- [ ] Dark mode works (`dark:` variants on all elements)
- [ ] Responsive: desktop (1280px), tablet (768px), mobile (375px)
- [ ] Auth guard: dashboard pages check user session
- [ ] RBAC: actions gated by `canView`/`canEdit`/`canPublish`
- [ ] Error handling: try-catch on async, toast on failure
- [ ] Loading states: skeleton or spinner during data fetch
- [ ] No `any` types (use proper interfaces)
- [ ] No inline styles (use Tailwind classes)
- [ ] No hardcoded Supabase URLs or keys
- [ ] Imports use `@/` paths (not relative `../../`)

## For AI routes

- [ ] `getEditorAuth()` checks JWT
- [ ] `hasEditorRole()` verifies role
- [ ] `checkRateLimit()` enforces limits
- [ ] `recordCost()` tracks spend
- [ ] Input validation with Zod schemas
- [ ] Error responses use standard format `{ error: string }`

## For section editor

- [ ] Uses `renderSectionWithResult()` for preview
- [ ] Handles both homepage (`website_sections`) and custom page (`website_pages.sections`)
- [ ] Content normalized via `normalizeContent()`
- [ ] Section types validated via `isValidSectionType()`
- [ ] Drag-and-drop uses `@dnd-kit` with 8px activation distance

## For components

- [ ] `'use client'` directive if using hooks/state/events
- [ ] Props typed with TypeScript interface
- [ ] `cn()` for conditional class merging
- [ ] `framer-motion` for animations (not CSS transitions)
- [ ] `sonner` for toasts (not custom alerts)
- [ ] Accessible: semantic HTML, aria-labels on buttons
