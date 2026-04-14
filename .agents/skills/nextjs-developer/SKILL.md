---
name: nextjs-developer
description: |
  Next.js development for the Website Studio (web-public/).
  USE WHEN: creating pages, components, API routes, hooks, AI chat integration,
  section editor, SEO features, or any Next.js work in web-public/.
  NOT FOR: Flutter code (use flutter-developer), database migrations (use backend-dev).

  Examples:
  <example>
  Context: User needs a new dashboard page.
  user: "Create the page editor with preview and section forms"
  assistant: "I'll use nextjs-developer skill for this Next.js page with dnd-kit and forms."
  <commentary>Dashboard pages require nextjs-developer.</commentary>
  </example>
  <example>
  Context: User needs an AI chat endpoint.
  user: "Create the studio-chat API route with streamText and tools"
  assistant: "I'll use nextjs-developer skill for this Vercel AI SDK integration."
  <commentary>AI API routes in web-public require nextjs-developer.</commentary>
  </example>
  <example>
  Context: User needs Flutter UI work.
  user: "Fix the itinerary details screen"
  assistant: "I'll use flutter-developer for this Flutter widget fix."
  <commentary>Flutter code uses flutter-developer, not this skill.</commentary>
  </example>
---

# Next.js Developer Skill

Elite Next.js Developer for the Bukeer Website Studio. Handles ALL frontend and API development in `web-public/`.

## Scope

**You Handle:**
- Dashboard pages and layouts (App Router)
- React components (client and server)
- API routes (`app/api/`)
- Vercel AI SDK integration (`streamText`, `useChat`, tools)
- Section system (registry, rendering, forms)
- Supabase data fetching (client + server)
- Auth flows and RBAC
- Hooks (autosave, keyboard shortcuts, etc.)
- SEO (scoring, meta tags, keywords, structured data)
- Drag-and-drop (dnd-kit)
- TipTap blog editor
- Styling (Tailwind v4, dark mode, M3 theme)
- Middleware (routing, auth guards, tenant detection)
- Build & deploy (Cloudflare Workers via OpenNext)

**Delegate To:**
- `flutter-developer`: Any Flutter/Dart code in `lib/`
- `backend-dev`: Database migrations, RLS policies, Edge Functions, RPCs
- `testing-agent`: Test creation (Jest, Playwright)
- `architecture-analyzer`: Architecture review

## Core Expertise

- Next.js 15.3+ (App Router, RSC, Server Actions)
- React 19 (server components, client components, Suspense)
- TypeScript strict mode
- Tailwind CSS v4 (CSS-first config, `@theme` layer)
- Supabase (PostgreSQL, Auth, RLS, Storage, Realtime)
- Vercel AI SDK 6.x (`streamText`, `generateObject`, `useChat`, tools)
- Cloudflare Workers (OpenNext adapter, R2, Durable Objects)

## Reference Files

For detailed patterns and guidelines, see:
- **PATTERNS.md**: Component patterns, data fetching, state management, error handling
- **SECTIONS.md**: Section system (registry, rendering, normalization, forms)
- **AI.md**: AI integration (LLM provider, tools, rate limiting, streaming)
- **CHECKLIST.md**: Pre-commit validation, quality gates

## Critical Rules

### UI Components — ALWAYS use `components/ui/` primitives
- NEVER write raw Tailwind for buttons, cards, inputs, dialogs, etc.
- ALWAYS import from `@/components/ui/` — these use Bukeer brand tokens automatically
- Available components (17):

| Component | Import | Use for |
|---|---|---|
| `Button` | `@/components/ui/button` | All buttons (variants: default, secondary, destructive, outline, ghost, link) |
| `Card` | `@/components/ui/card` | Content containers (`Card`, `CardHeader`, `CardContent`, `CardFooter`) |
| `Badge` | `@/components/ui/badge` | Status badges, tags |
| `Input` | `@/components/ui/input` | Text inputs |
| `Textarea` | `@/components/ui/textarea` | Multi-line inputs, chat input |
| `Label` | `@/components/ui/label` | Form labels |
| `Select` | `@/components/ui/select` | Dropdowns (`Select`, `SelectTrigger`, `SelectContent`, `SelectItem`) |
| `Tabs` | `@/components/ui/tabs` | Tab panels (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`) |
| `Dialog` | `@/components/ui/dialog` | Modals, confirmations (`Dialog`, `DialogTrigger`, `DialogContent`) |
| `DropdownMenu` | `@/components/ui/dropdown-menu` | Context menus, ⋮ menus |
| `Sheet` | `@/components/ui/sheet` | Side panels, mobile bottom sheets |
| `Tooltip` | `@/components/ui/tooltip` | Hover tooltips (needs `TooltipProvider` in layout) |
| `ScrollArea` | `@/components/ui/scroll-area` | Scrollable areas (chat message list) |
| `Separator` | `@/components/ui/separator` | Horizontal/vertical dividers |
| `Skeleton` | `@/components/ui/skeleton` | Loading placeholders |
| `Toggle` | `@/components/ui/toggle` | Toggle buttons (viewport switcher) |

**Example — correct usage:**
```tsx
// GOOD: uses UI primitive with brand tokens
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Button variant="default">Save</Button>           // → Bukeer Purple
<Button variant="secondary">Preview</Button>       // → Bukeer Teal
<Button variant="destructive">Delete</Button>      // → Bukeer Red
<Card><CardContent>...</CardContent></Card>         // → uses --card, --border tokens

// BAD: raw Tailwind — breaks brand consistency
<button className="px-4 py-2 bg-blue-600 text-white rounded-xl">Save</button>
```

### Brand Tokens — Bukeer theme in `globals.css`
- Primary: **Purple #7C57B3** (`--primary`) — buttons, focus rings, sidebar active
- Secondary: **Teal #39D2C0** (`--secondary`) — secondary actions, accents
- Accent: **Orange #EE8B60** (`--accent`) — highlights, CTAs
- Destructive: **Red #FF5963** (`--destructive`) — errors, delete actions
- Tokens are in `oklch` format in `globals.css` `:root` and `.dark` blocks
- NEVER hardcode hex colors — ALWAYS use token classes (`bg-primary`, `text-muted-foreground`, etc.)
- All components in `components/ui/` read these tokens automatically via CSS vars

### Component Rules
- ALWAYS use `'use client'` for interactive components (hooks, state, events)
- NEVER put hooks in server components (no `useState`, `useEffect` in RSC)
- ALWAYS type props with TypeScript interfaces (no `any`)
- ALWAYS use Tailwind token classes — NEVER inline styles or hardcoded colors
- ALWAYS support dark mode with `dark:` prefix (tokens handle this automatically)
- ALWAYS use `framer-motion` for animations (already installed)
- ALWAYS use `cn()` from `@/lib/utils` for conditional class merging

### Data
- ALWAYS use types from `@bukeer/website-contract` for website data
- ALWAYS normalize section content with `normalizeContent()` before rendering
- ALWAYS use `createSupabaseBrowserClient()` in client components
- ALWAYS use `createSupabaseServerClient()` in server components/layouts
- NEVER access Supabase directly in middleware — use `supabaseFetch()` helper

### Auth
- ALWAYS check auth in dashboard layouts (server-side redirect)
- ALWAYS use `getEditorAuth()` for AI API routes
- ALWAYS use `checkRateLimit()` before LLM calls
- NEVER expose service role key to client — server-only

### RBAC
- Use exact contract from `lib/admin/permissions.ts`:
  - `canView` — viewer, agent, admin, super_admin
  - `canEdit` — agent, admin, super_admin
  - `canPublish` — admin, super_admin
  - `canManageSettings` — admin, super_admin
  - `canManageDomain` — super_admin only

### Sections
- ALWAYS use `section-registry.tsx` as source of truth (42 types)
- ALWAYS render via `renderSectionWithResult()` — handles validation + normalization
- NEVER hardcode section types — use `isValidSectionType()` guard
- ALWAYS use `sectionTypesByCategory` for section picker UI

### AI
- ALWAYS use `getEditorModel()` from `lib/ai/llm-provider.ts`
- ALWAYS check rate limits before LLM calls
- ALWAYS record cost after LLM calls with `recordCost()`
- Use `streamText` for streaming chat, `generateObject` for structured output
- Tools in `streamText` should map to existing action types

### Styling
- Tailwind v4 CSS-first — config is in `app/globals.css` `@theme` layer
- Use CSS vars for colors: `--primary`, `--secondary`, `--muted`, etc.
- Dark mode: `dark:` prefix + `next-themes` provider
- Import utility: `cn()` from `lib/utils` for class merging

### Hooks (available, reuse them)
- `useAutosave()` — debounced save with retry (2s, 3 retries, exponential backoff)
- `useDirtyState()` — track unsaved changes + beforeunload
- `useKeyboardShortcuts()` — register Cmd+S, Cmd+Z, Cmd+K
- `useLocalBackup()` — LocalStorage draft recovery
- `useNetworkStatus()` — online/offline detection
- `useOptimisticMutation()` — optimistic UI with rollback
- `useWebsite()` — website context (data + save + publish)

## Project Structure

```
web-public/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # Auth pages (login, reset)
│   ├── dashboard/               # Admin Studio
│   │   ├── [websiteId]/         # Per-website tabs
│   │   │   ├── pages/           # Pages management
│   │   │   ├── blog/            # Blog management
│   │   │   ├── design/          # Theme editor
│   │   │   ├── content/         # Content & SEO
│   │   │   ├── products/        # Featured products
│   │   │   ├── quotes/          # Leads CRM
│   │   │   ├── analytics/       # Tracker config
│   │   │   └── settings/        # Domain, versions
│   │   └── new/                 # Create wizard
│   ├── editor/[websiteId]/      # Visual editor (Puck legacy)
│   ├── site/[subdomain]/        # Public tenant sites (SSR)
│   ├── domain/[host]/           # Custom domain sites
│   └── api/ai/editor/           # AI endpoints (8 routes)
├── components/
│   ├── admin/                   # Dashboard components
│   ├── editor/                  # Editor components
│   ├── site/sections/           # 16 section components
│   ├── studio/                  # NEW: page editor components
│   └── ui/                      # Primitives (button, card, etc.)
├── lib/
│   ├── supabase/                # Auth clients (browser, server, middleware)
│   ├── admin/                   # Permissions, contexts
│   ├── sections/                # Registry, renderer, normalization
│   ├── ai/                      # LLM provider, auth, rate limiting
│   ├── hooks/                   # 6 production-ready hooks
│   ├── theme/                   # M3 theme provider
│   ├── blog/                    # Content scorer (21 checks)
│   ├── studio/                  # NEW: section-fields, section-actions
│   └── puck/                    # DEPRECATED: adapters, configs, plugins
└── packages/
    ├── website-contract/        # Shared types (WebsiteData, Section)
    └── theme-sdk/               # M3 compiler (tokens, presets)
```

## Key Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | 15.3.9 | App Router, RSC, API routes |
| `react` | 19.0.0 | UI framework |
| `ai` | 6.0.116 | Vercel AI SDK (`streamText`, `generateObject`) |
| `@ai-sdk/react` | TBD | `useChat` hook (to install) |
| `@ai-sdk/openai` | 3.0.46 | OpenRouter LLM provider |
| `@supabase/ssr` | 0.9.0 | Auth cookie management |
| `@supabase/supabase-js` | 2.100.0 | Database client |
| `@dnd-kit/core` | 6.3.1 | Drag-and-drop |
| `@dnd-kit/sortable` | 10.0.0 | Sortable lists |
| `@tiptap/react` | 2.11.5 | Rich text editor |
| `@radix-ui/*` | various | Headless UI primitives |
| `framer-motion` | 12.19.1 | Animations |
| `zod` | 4.3.5 | Schema validation |
| `sonner` | 2.0.7 | Toast notifications |
| `next-themes` | 0.4.4 | Dark mode |
| `lucide-react` | 0.523.0 | Icons |

## Testing Commands

```bash
cd web-public
npm test                    # Jest unit tests
npm run test:watch          # Jest watch mode
npx playwright test         # E2E tests
npm run typecheck           # TypeScript check
npm run lint                # ESLint
npm run build               # Next.js build
npm run build:worker        # Cloudflare Workers build
npm run preview:worker      # Local Workers preview
```

## Data Model (homepage vs custom pages)

| | Homepage | Custom Page |
|---|---|---|
| Secciones en | `website_sections` tabla (1 fila/seccion) | `website_pages.sections` JSONB array |
| Carga RPC | `get_website_editor_snapshot` | `get_page_editor_snapshot` |
| Guardado | UPDATE `website_sections` por id | UPDATE `website_pages` SET sections |
| pageId | Virtual `home` | UUID real |

## AI API Routes (existentes)

| Endpoint | Vercel AI SDK | Qué hace |
|---|---|---|
| `/api/ai/editor/copilot` | `generateObject` | Plan de acciones (8 tipos) |
| `/api/ai/editor/generate-section` | `generateObject` | Genera contenido de seccion |
| `/api/ai/editor/improve-text` | `generateObject` | 6 acciones de texto |
| `/api/ai/editor/score-content` | Algoritmico ($0) | 21 checks SEO |
| `/api/ai/editor/suggest-sections` | `generateObject` | Sugiere secciones |
| `/api/ai/editor/generate-blog` | `generateObject` | Post blog (v1/v2) |
| `/api/ai/public-chat` | `streamText` | Chat publico visitantes |
| `/api/ai/studio-chat` | `streamText` + tools | **NUEVO**: Chat del Studio |

## Epic Reference

- **Epic**: weppa-cloud/bukeer-flutter#554
- **Spec**: `docs/specs/SPEC_STUDIO_PAGE_EDITOR_WITHOUT_PUCK.md`
- **Issues**: #566 (editor), #567 (chat AI), #568 (SEO), #569 (deprecar Puck)

## L10N Rule
Dashboard UI is in English. Public site content is multi-language (es/en/pt/fr).
Use `next-intl` or manual locale detection for public pages.
Dashboard labels can be hardcoded English (no i18n framework for admin).
