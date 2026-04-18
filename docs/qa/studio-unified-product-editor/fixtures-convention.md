# CT Fixture Convention — Studio Unified Product Editor

**Applies to:** all component tests under `__tests__/ct/**` for dashboard editors delivered by [[#190]] and children.
**Tooling:** `@playwright/experimental-ct-react` ([[ADR-023]]).

---

## File layout

```
__tests__/
├── ct/                                   # Component tests (Playwright CT)
│   ├── ui/                               # shadcn/ui primitives (pre-existing)
│   │   └── <primitive>.spec.tsx
│   └── studio-editor/                    # Studio editor components
│       ├── page-customization/
│       │   └── <editor>.spec.tsx
│       └── content-health/
│           └── <component>.spec.tsx
└── visual/
    └── studio-editor-baselines/          # Screenshot baselines
        └── <component>/
            ├── <component>-<state>-chromium-linux.png
            └── …
```

**Rule:** mirror the component tree. If `components/admin/page-customization/hero-override-editor.tsx` exists → test lives at `__tests__/ct/studio-editor/page-customization/hero-override-editor.spec.tsx`.

---

## Required states per component

Every editor/component **MUST** cover these four states minimum:

| State | When | Assertion |
|-------|------|-----------|
| `empty` | No data yet | Renders empty state + CTA (no crash) |
| `loading` | Data fetching | Skeleton visible, no flash |
| `filled` | Happy path | Data rendered correctly |
| `error` | Fetch/save fails | Error banner + retry CTA |

**Domain-specific states** — add as applicable:

- `ai-diff` — diff preview visible (Phase 2 editors).
- `locked` — AI lock flag on (`*_ai_generated=false`).
- `ghost` — section would render empty on landing (health panel).
- `disabled` — RBAC insufficient, read-only banner.
- `mobile` — 360px viewport (explicit `page.setViewportSize`).

---

## Fixture file structure

```tsx
// __tests__/ct/studio-editor/page-customization/hero-override-editor.spec.tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { HeroOverrideEditor } from '@/components/admin/page-customization/hero-override-editor';

// Fixtures — keep inline. Prefer factory functions for variations.
const emptyFixture = {
  productId: 'prod-123',
  current: { title: null, subtitle: null, backgroundImage: null },
};

const filledFixture = {
  productId: 'prod-123',
  current: { title: 'Custom Title', subtitle: 'Custom sub', backgroundImage: '/img.jpg' },
};

test.describe('<HeroOverrideEditor>', () => {
  // Functional assertions
  test('empty — shows "personalizar hero" toggle', async ({ mount }) => {
    const c = await mount(<HeroOverrideEditor {...emptyFixture} />);
    await expect(c.getByRole('switch', { name: /personalizar/i })).toBeVisible();
  });

  test('filled — renders current values', async ({ mount }) => {
    const c = await mount(<HeroOverrideEditor {...filledFixture} />);
    await expect(c.getByRole('textbox', { name: /título/i })).toHaveValue('Custom Title');
  });

  // Visual regression — one per meaningful state
  test('visual — empty', async ({ mount }) => {
    const c = await mount(<HeroOverrideEditor {...emptyFixture} />);
    await expect(c).toHaveScreenshot('hero-override-editor-empty.png');
  });

  test('visual — filled', async ({ mount }) => {
    const c = await mount(<HeroOverrideEditor {...filledFixture} />);
    await expect(c).toHaveScreenshot('hero-override-editor-filled.png');
  });
});
```

---

## Naming

| Artifact | Pattern | Example |
|----------|---------|---------|
| Test file | `<component-kebab>.spec.tsx` | `hero-override-editor.spec.tsx` |
| Describe | `<ComponentName>` | `<HeroOverrideEditor>` |
| Functional test | `<state> — <assertion>` | `empty — shows toggle` |
| Visual test | `visual — <state>` | `visual — filled` |
| Screenshot file | `<component-kebab>-<state>.png` | `hero-override-editor-empty.png` |

---

## Fixture factories (for variations)

Extract factories when 3+ tests share a base and only override 1-2 fields:

```tsx
function makeHealthFixture(overrides: Partial<ContentHealth> = {}): ContentHealth {
  return {
    product_id: 'prod-123',
    score: 72,
    ghosts: [],
    ai_fields: [],
    fallbacks: [],
    computed: [],
    last_computed_at: new Date().toISOString(),
    ...overrides,
  };
}

test('score 72 renders yellow', async ({ mount }) => {
  const c = await mount(<ContentHealthScore data={makeHealthFixture()} />);
  await expect(c.locator('[data-color]')).toHaveAttribute('data-color', 'yellow');
});

test('score 95 renders green', async ({ mount }) => {
  const c = await mount(<ContentHealthScore data={makeHealthFixture({ score: 95 })} />);
  await expect(c.locator('[data-color]')).toHaveAttribute('data-color', 'green');
});
```

Place factories alongside the spec (`__tests__/ct/studio-editor/.../fixtures.ts`) when reused across spec files. Keep inline otherwise.

---

## Mocking DB / API calls

Component tests **MUST NOT** hit Supabase or real API routes.

- Mock via Playwright's `page.route()` if the component fetches.
- Prefer prop injection — hooks that wrap `fetch` accept an `adapter` prop for testing.
- Example pattern:

```tsx
test('fetch error shows banner', async ({ mount, page }) => {
  await page.route('**/api/content/health/**', (route) =>
    route.fulfill({ status: 500, body: JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: 'x' } }) })
  );
  const c = await mount(<ContentHealthDashboard websiteId="w-1" />);
  await expect(c.getByRole('alert')).toContainText(/error/i);
});
```

---

## Visual regression rules

1. **One screenshot per meaningful state.** Don't screenshot every assertion — only states users perceive differently.
2. **Animations disabled.** Config enforces `animations: 'disabled'`; avoid CSS transitions mid-screenshot.
3. **Tolerance:** default `maxDiffPixelRatio: 0.05` (5%). Override only with justification:
   ```tsx
   await expect(c).toHaveScreenshot('foo.png', { maxDiffPixelRatio: 0.1 }); // font rendering quirk on CI
   ```
4. **Regenerate baselines:**
   ```bash
   npm run test:ct:update
   ```
   Commit regenerated `*.png` with the PR that caused the visual change. Reviewer must acknowledge visual diff in PR body.
5. **Flakiness:** if a baseline is flaky across 3 runs, increase tolerance or exclude test. Document reason in comment above the `toHaveScreenshot` call.

---

## RBAC / auth in tests

Components should accept `currentRole` as a prop (or context) for testing. Do NOT import server-only `getEditorAuth` in a CT test — it will fail to resolve.

Pattern:

```tsx
test('agent sees read-only banner', async ({ mount }) => {
  const c = await mount(<HeroOverrideEditor {...filledFixture} currentRole="agent" />);
  await expect(c.getByRole('banner')).toContainText(/solo lectura/i);
});
```

---

## Excluded patterns

❌ Don't import `@/lib/supabase/server` — server-only, breaks CT.
❌ Don't import from `app/**` — App Router runtime not available in CT.
❌ Don't rely on `next/headers` or `cookies()` — not available in CT.
❌ Don't wrap in `<ThemeProvider>` if `app/globals.css` alone suffices — CSS vars are enough for most visual tests.
❌ Don't hardcode long strings used for assertions — extract to top of file or factory.

---

## Coverage gate

Per [[#190]] AC18-22 and [[ADR-023]]:

- **Each Phase child issue must ship ≥1 CT spec per new component** with all 4 required states.
- **Visual baselines must be captured + committed** before merge.
- **CI** (`ct-visual.yml`) must pass on PR.

PR template includes the checklist:

```markdown
- [ ] CT spec(s) cover empty/loading/filled/error states
- [ ] Visual baselines committed
- [ ] `npm run test:ct` passes locally
```

---

## References

- Playwright CT docs: https://playwright.dev/docs/test-components
- [[ADR-023]] — Tooling decision rationale.
- [[#190]] — Parent EPIC.
- `playwright-ct.config.ts` — Active config.
