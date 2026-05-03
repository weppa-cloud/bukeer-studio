/**
 * Growth OS console UI E2E contract — issue #409.
 *
 * GATING: every test in this file is skipped unless
 *   GROWTH_OS_UI_E2E_ENABLED === "true"
 * is set in the environment. The Growth OS UI is not yet shipped at the
 * `/dashboard/[websiteId]/growth` route — these tests describe the contract
 * the future UI must satisfy. Enable explicitly when wiring up the UI.
 *
 * SESSION POOL (CRITICAL):
 *   Run with: SESSION_NAME=s2 PORT=3002 GROWTH_OS_UI_E2E_ENABLED=true \
 *     npm run test:e2e:session -- --grep "growth-os"
 *   Or via session-run: GROWTH_OS_UI_E2E_ENABLED=true \
 *     npm run session:run -- --grep "growth-os"
 *
 * NEVER run on port 3000. Port + baseURL must come from the acquired session
 * slot via PORT and PLAYWRIGHT_BASE_URL env vars; this spec must not hardcode
 * either. See `.claude/rules/e2e-sessions.md`.
 *
 * TODO(playwright-config): the project-level playwright.config.ts currently
 * defaults baseURL to `http://localhost:3000` when neither E2E_BASE_URL nor
 * PLAYWRIGHT_BASE_URL is set. The `npm run test:e2e:session` script wires
 * PORT through to E2E_BASE_URL, so this is a no-op when invoked correctly.
 * Do not edit the config from this spec.
 */
import { test, expect } from "@playwright/test";
import {
  CANONICAL_LANES,
  growthConsoleUrl,
  rolesProvisioned,
  signInAs,
  tenantA,
  tenantB,
  usersByRole,
} from "../fixtures/growth-os-fixtures";

const growthUiEnabled = process.env.GROWTH_OS_UI_E2E_ENABLED === "true";

// Resolve PORT / baseURL from env, never hardcode. Playwright already honors
// `use.baseURL`, but we expose this for log lines and any explicit URL build.
const PORT = process.env.PORT ?? process.env.E2E_PORT ?? "3001";
const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.E2E_BASE_URL ??
  `http://localhost:${PORT}`;

test.describe("Growth OS console UI contract @growth-os-ui", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test.skip(
    !growthUiEnabled,
    "Growth OS UI is not shipped yet. Enable with GROWTH_OS_UI_E2E_ENABLED=true when implementing /dashboard/[websiteId]/growth.",
  );

  test.beforeAll(() => {
    // Surface the resolved base URL in test output so reviewers can confirm
    // the session pool was honored (no port-3000 hardcoding).
    // eslint-disable-next-line no-console
    console.log(
      `[growth-os-ui] baseURL=${BASE_URL} tenantA=${tenantA.websiteId}`,
    );
  });

  test("Overview tab loads with metric cards and 5-lane status table", async ({
    page,
  }) => {
    await page.goto(growthConsoleUrl(tenantA));

    await expect(
      page.getByRole("heading", { name: /growth os/i }),
    ).toBeVisible();

    const overviewTab = page.getByRole("link", { name: /command center/i });
    await expect(overviewTab).toBeVisible();
    await overviewTab.click();

    // Four canonical metric cards (counts may be zero on a fresh tenant —
    // we only assert presence, not values).
    const metricCards = page.getByTestId(/^growth-overview-metric-/);
    await expect(metricCards).toHaveCount(4);

    // Lane status table renders exactly the 5 canonical lanes.
    const laneTable = page.getByTestId("growth-overview-lane-table");
    await expect(laneTable).toBeVisible();
    for (const lane of CANONICAL_LANES) {
      await expect(
        laneTable.getByTestId(`growth-overview-lane-row-${lane}`),
      ).toBeVisible();
    }
    await expect(laneTable.getByRole("row")).toHaveCount(
      CANONICAL_LANES.length + 1, // +1 for the header row
    );
    await expect(
      page.getByTestId("growth-command-center-attention"),
    ).toBeVisible();
  });

  test("Agent Team tab loads cards and required column headers", async ({
    page,
  }) => {
    await page.goto(`${growthConsoleUrl(tenantA)}/agents`);
    await page.waitForURL(/\/growth\/agents$/);

    await expect(page.getByTestId("growth-agent-team-cards")).toBeVisible();

    const agentsTable = page.getByTestId("growth-agents-table");
    await expect(agentsTable).toBeVisible();

    const toolMatrix = page.getByTestId("growth-agent-tool-matrix");
    await expect(toolMatrix).toBeVisible();
    for (const actionClass of [
      "content_publish",
      "transcreation_merge",
      "paid_mutation",
      "experiment_activation",
      "outreach_send",
    ]) {
      await expect(toolMatrix).toContainText(actionClass);
    }
    await expect(toolMatrix.getByText("Human").first()).toBeVisible();
    await expect(toolMatrix.getByText("Blocked").first()).toBeVisible();

    for (const header of [
      /^name$/i,
      /^lane$/i,
      /^mode$/i,
      /^model$/i,
      /agreement[_ ]threshold/i,
    ]) {
      await expect(
        agentsTable.getByRole("columnheader", { name: header }),
      ).toBeVisible();
    }
  });

  test("Opportunities tab loads (empty state OR populated list)", async ({
    page,
  }) => {
    await page.goto(`${growthConsoleUrl(tenantA)}/backlog`);
    await page.waitForURL(/\/growth\/backlog/);

    // Tenant scope indicator stays accurate.
    await expect(page.getByTestId("growth-current-website-id")).toContainText(
      tenantA.websiteId,
    );

    const emptyState = page.getByTestId("growth-backlog-empty-state");
    const backlogTable = page.getByTestId("growth-backlog-table");

    // Either the empty state OR the table is visible; exactly one of them.
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    const tableVisible = await backlogTable.isVisible().catch(() => false);
    expect(emptyVisible || tableVisible).toBe(true);
    expect(emptyVisible && tableVisible).toBe(false);

    if (tableVisible) {
      await expect(page.getByText("Ejecución real por agente")).toBeVisible();
      await expect(
        page.getByText("QUÉ DEBE REVISAR MARKETING").first(),
      ).toBeVisible();
    }
  });

  test("Runs tab loads (empty state OK)", async ({ page }) => {
    await page.goto(`${growthConsoleUrl(tenantA)}/runs`);
    await page.waitForURL(/\/growth\/runs/);
    await expect(
      page.getByRole("heading", { name: /review queue/i }),
    ).toBeVisible();

    const runsList = page.getByTestId("growth-runs-list");
    const runsEmpty = page.getByTestId("growth-runs-empty-state");

    await expect(runsList.or(runsEmpty)).toBeVisible();
  });

  test("Experiments and Data Health tabs load human control-plane surfaces", async ({
    page,
  }) => {
    await page.goto(`${growthConsoleUrl(tenantA)}/experiments`);
    await page.waitForURL(/\/growth\/experiments$/);
    await expect(
      page.getByRole("heading", { name: /experiments/i }),
    ).toBeVisible();
    await expect(page.getByTestId("growth-experiments-summary")).toBeVisible();

    await page.goto(`${growthConsoleUrl(tenantA)}/data-health`);
    await page.waitForURL(/\/growth\/data-health$/);
    await expect(
      page.getByRole("heading", { name: "Data Health", exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("growth-data-health-summary")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /runtime maturity score/i }),
    ).toBeVisible();
    await expect(page.getByTestId("growth-runtime-health")).toBeVisible();
  });

  test("Cross-tenant guard: tenant A user cannot read tenant B Growth data", async ({
    page,
  }) => {
    const response = await page.goto(growthConsoleUrl(tenantB), {
      waitUntil: "domcontentloaded",
    });

    const status = response?.status() ?? 0;
    const finalUrl = page.url();

    const redirectedAway =
      finalUrl.includes("/dashboard") &&
      !finalUrl.includes(`/${tenantB.websiteId}/growth`);
    const isNotFound = status === 404;
    const isForbidden =
      status === 403 ||
      (await page
        .getByText(/forbidden|no autorizado|access denied/i)
        .isVisible()
        .catch(() => false));

    // Growth content MUST not render for tenant B. This is the strongest
    // signal even if Next.js renders the parent dashboard chrome at the
    // same URL (server-side `redirect()` from a nested layout commits an
    // empty child tree but does not always rewrite the URL — see
    // https://github.com/vercel/next.js/issues#layout-redirect-url-flicker).
    const growthHeading = page.getByRole("heading", { name: /growth os/i });
    const growthContentRendered = await growthHeading
      .isVisible()
      .catch(() => false);
    const growthContentBlocked = !growthContentRendered;

    expect(
      redirectedAway || isNotFound || isForbidden || growthContentBlocked,
      `Expected cross-tenant access to tenantB (${tenantB.websiteId}) to be denied. Got status=${status} url=${finalUrl} growthContentRendered=${growthContentRendered}`,
    ).toBe(true);

    // Whatever the rejection mechanism, tenant B's id must NOT appear in the
    // tenant-scope indicator if it renders at all.
    const scopeIndicator = page.getByTestId("growth-current-website-id");
    if (await scopeIndicator.isVisible().catch(() => false)) {
      await expect(scopeIndicator).not.toContainText(tenantB.websiteId);
    }
  });

  test("Role-gated actions: Approve/Reject hidden or disabled for viewer; enabled for curator", async ({
    page,
  }) => {
    test.skip(
      !rolesProvisioned(),
      "Role-aware fixtures not provisioned (set E2E_GROWTH_ROLE_FIXTURES_READY=true). TODO(auth-fixture).",
    );

    // Viewer: open Run detail, expect Approve/Reject hidden OR disabled.
    await signInAs(page, usersByRole.viewer.role);
    await page.goto(growthConsoleUrl(tenantA));
    await page.getByRole("link", { name: /review queue/i }).click();
    await page.waitForURL(/\/growth\/runs$/);
    await page
      .getByTestId(/^growth-run-row-/)
      .first()
      .getByRole("link")
      .first()
      .click();

    const approveBtn = page.getByRole("button", { name: /approve/i });
    const rejectBtn = page.getByRole("button", { name: /reject/i });

    for (const btn of [approveBtn, rejectBtn]) {
      const visible = await btn.isVisible().catch(() => false);
      if (visible) {
        await expect(btn).toBeDisabled();
      }
    }

    // Curator: same Run detail, Approve/Reject must be enabled.
    await signInAs(page, usersByRole.curator.role);
    await page.goto(growthConsoleUrl(tenantA));
    await page.getByRole("link", { name: /review queue/i }).click();
    await page.waitForURL(/\/growth\/runs$/);
    await page
      .getByTestId(/^growth-run-row-/)
      .first()
      .getByRole("link")
      .first()
      .click();

    await expect(page.getByRole("button", { name: /approve/i })).toBeEnabled();
    await expect(page.getByRole("button", { name: /reject/i })).toBeEnabled();
  });

  test("Append-only events: Run detail exposes no event-mutation affordances", async ({
    page,
  }) => {
    await page.goto(growthConsoleUrl(tenantA));
    await page.getByRole("link", { name: /review queue/i }).click();
    await page.waitForURL(/\/growth\/runs$/);

    // If there are no runs yet, the empty state is acceptable — there is
    // nothing to mutate, which trivially satisfies append-only.
    const firstRun = page.getByTestId(/^growth-run-row-/).first();
    const hasRun = await firstRun.isVisible().catch(() => false);
    test.skip(
      !hasRun,
      "No runs available to inspect for append-only guarantees.",
    );

    await Promise.all([
      page.waitForURL(/\/growth\/runs\/[0-9a-f-]+$/),
      firstRun.getByRole("link").first().click(),
    ]);

    await expect(page.getByTestId("growth-run-learning-panel")).toBeVisible();

    const events = page.getByTestId(/^growth-run-event-row-/);
    await expect(events.first()).toBeVisible();

    // No delete/edit/remove affordance may exist on any event row.
    const forbiddenAffordances = page
      .getByTestId(/^growth-run-event-row-/)
      .getByRole("button", { name: /delete|remove|edit|undo|revert/i });
    await expect(forbiddenAffordances).toHaveCount(0);

    // Defense-in-depth: no destructive icon buttons on the events panel.
    const eventsPanel = page.getByTestId("growth-run-events-panel");
    if (await eventsPanel.isVisible().catch(() => false)) {
      const destructiveByLabel = eventsPanel.getByRole("button", {
        name: /trash|delete event|remove event/i,
      });
      await expect(destructiveByLabel).toHaveCount(0);
    }
  });
});
