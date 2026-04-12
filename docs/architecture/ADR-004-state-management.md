# ADR-004: State Management without Global Store

**Status:** Accepted
**Date:** 2026-04-12
**Principles:** P1, P7

## Context

The 2020-2023 era defaulted to global state libraries (Redux, MobX) for any React project. In 2026 with React 19 Server Components, most "state" is actually server data that should never live in a client store.

bukeer-studio currently uses no global state library — only React Context (WebsiteProvider, M3ThemeProvider) and custom hooks. This is intentional and should remain so.

## Decision

### State categories

| Category | Tool | Example |
|---|---|---|
| **Server data (public)** | RSC direct fetch | Website content, blog posts, sections |
| **Server data (dashboard)** | React Context + fetch | Website being edited, pages list |
| **Form state** | `useActionState` / React Hook Form | Section editor fields, SEO form |
| **Ephemeral UI** | `useState` | Modal open, dropdown visible, tooltip |
| **Persistent UI** | URL `searchParams` | Active tab, filter, pagination, sort |
| **Optimistic mutations** | `useOptimistic` / `useOptimisticMutation` | Save section, publish page |
| **Draft recovery** | `useLocalBackup` (localStorage) | Unsaved editor content |
| **Network awareness** | `useNetworkStatus` | Online/offline indicator |

### No global state library

**Why not Zustand/Redux/Jotai:**
- Public site pages are 100% Server Components — zero client state needed
- Dashboard state is scoped to WebsiteProvider context — no cross-route sharing
- Editor state is scoped to the editor page — no global persistence needed
- Adding a client state library increases bundle size (violates P10) for no benefit

### React Context for scoped state

Context is used for state that multiple components in a subtree need:

```typescript
// WebsiteProvider — dashboard subtree
<WebsiteProvider websiteId={id}>
  <DashboardLayout>     {/* reads website data */}
    <PageEditor />       {/* reads + writes pages */}
    <ThemeEditor />      {/* reads + writes theme */}
  </DashboardLayout>
</WebsiteProvider>

// M3ThemeProvider — public site subtree
<M3ThemeProvider theme={website.theme}>
  <Header />
  <Sections />
  <Footer />
</M3ThemeProvider>
```

### URL state for shareable state

Anything that should survive a page refresh or be shareable goes in the URL:

```typescript
// Dashboard filters
/dashboard/abc123/pages?status=published&sort=updated

// Public site pagination
/site/agency/destinos?page=2&region=caribe
```

### React 19 patterns for mutations

```typescript
// useActionState for forms
const [state, formAction, isPending] = useActionState(saveSection, initialState)

// useOptimistic for instant feedback
const [optimisticSections, addOptimistic] = useOptimistic(sections)
```

## Consequences

- **Zero additional bundle** for state management
- **Server-first mindset** — most data stays on the server
- **Simple mental model** — state lives where it's used
- **Trade-off:** If cross-route state sharing becomes necessary (e.g., real-time collaboration), Zustand would be the first choice
- **Trade-off:** Context re-renders all consumers on any change — acceptable for current scale, but may need selective subscriptions (via `useSyncExternalStore`) at scale

## References

- [State Management in React 2026](https://www.c-sharpcorner.com/article/state-management-in-react-2026-best-practices-tools-real-world-patterns/)
- [React 19 useActionState](https://react.dev/reference/react/useActionState)
- [React 19 useOptimistic](https://react.dev/reference/react/useOptimistic)
