# Testing Guide — Bukeer Studio

Three layers. Pick the right one for your task.

| Layer | Tool | Scope | Runs where |
|-------|------|-------|:----------:|
| **Unit** | Jest | Pure functions, hooks, logic | `__tests__/lib/**`, `__tests__/schema/**`, `__tests__/components/**` (non-UI) |
| **Component (CT)** | Playwright Component Testing | Isolated React components + visual regression | `__tests__/ct/**` |
| **E2E** | Playwright | Full user flows through running app | `e2e/tests/**` |

---

## Unit tests (Jest)

```bash
npm test                # all jest tests
npm run test:watch      # watch mode
npx jest path/to/spec   # single file
```

Use for pure logic: utils, hooks, Zod schemas, normalization functions, API route contract shape.
**Don't** test React rendering here — use CT layer instead.

---

## Component tests (Playwright CT)

Isolated components + visual regression. Uses `@playwright/experimental-ct-react` per [[ADR-023]].

```bash
npm run test:ct                # run all CT tests
npm run test:ct -- --grep foo  # filter by name
npm run test:ct:update         # regenerate visual baselines
```

**Config:** `playwright-ct.config.ts`
**Tests:** `__tests__/ct/**/*.spec.tsx`
**Baselines:** `__tests__/visual/studio-editor-baselines/**/*.png` (committed to git)
**Fixture convention:** `docs/qa/studio-unified-product-editor/fixtures-convention.md`

### Required states

Every Studio editor component MUST cover:

- `empty` · `loading` · `filled` · `error` (minimum)
- Domain-specific: `ai-diff`, `locked`, `ghost`, `disabled`, `mobile`

### Writing a CT test

```tsx
import { test, expect } from '@playwright/experimental-ct-react';
import { MyComponent } from '@/components/admin/my-component';

test('renders label', async ({ mount }) => {
  const c = await mount(<MyComponent label="Hello" />);
  await expect(c).toHaveText('Hello');
});

test('visual', async ({ mount }) => {
  const c = await mount(<MyComponent label="Hello" />);
  await expect(c).toHaveScreenshot('my-component.png');
});
```

### When to regenerate baselines

- Visual change is intentional (design update, layout fix).
- `npm run test:ct:update` locally.
- Commit the regenerated `*.png` with the PR.
- PR description explains the visual diff.

### Don't use CT for

- Flows that require the App Router runtime (`next/headers`, `cookies()`, `app/**/page.tsx`).
- Supabase server client. Mock via `page.route()` or prop injection.
- Multi-page flows. Those are E2E.

---

## E2E tests (Playwright)

**Mandatory:** use the session pool. See [[e2e-sessions]] for rules.

```bash
npm run session:list                        # check free slots
npm run session:run                         # auto-claim + run all tests + auto-release
npm run session:run -- --grep "checkout"    # pass Playwright args after --
npm run session:release s2                  # release stuck slot
```

**Never** run `npm run test:e2e` or `npm run dev` directly from an agent — collides with other sessions on port 3000. Port 3000 is reserved for manual dev.

### Pool

| Slot | Port | Report |
|------|------|--------|
| s1   | 3001 | `playwright-report/s1` |
| s2   | 3002 | `playwright-report/s2` |
| s3   | 3003 | `playwright-report/s3` |
| s4   | 3004 | `playwright-report/s4` |

### Interactive / Playwright MCP pattern

```bash
eval "$(bash scripts/session-acquire.sh)"
PORT=$PORT NEXT_DIST_DIR=.next-$SESSION_NAME npm run dev:session &
timeout 60 bash -c "until curl -s http://localhost:$PORT > /dev/null; do sleep 1; done"
# ... MCP tests on http://localhost:$PORT ...
bash scripts/session-release.sh "$_ACQUIRED_SESSION"
```

---

## Quality gates (mandatory before commit)

```bash
npx tsc --noEmit        # 0 type errors
npm run lint            # 0 lint errors
npm test                # jest passes
npm run test:ct         # CT passes (if components changed)
npm run session:run     # E2E passes (if user flows changed)
```

For component-only PRs (no page/flow change), skip E2E. CT + unit + tsc + lint is enough.

---

## CI

| Workflow | File | Trigger |
|----------|------|---------|
| Deploy + quality gates | `.github/workflows/deploy.yml` | Push to `main` |
| CT + visual regression | `.github/workflows/ct-visual.yml` | PR touching `components/**`, CT tests, or visual baselines |

Both use chromium only. Cross-browser tests run via `workflow_dispatch` if needed.

---

## References

- [[ADR-023]] — Playwright CT decision.
- [[ADR-036]] — Dual-Layer Testing Surface.
- [[e2e-sessions]] — Session pool rules.
- `docs/qa/studio-unified-product-editor/fixtures-convention.md` — CT fixture structure.
