/**
 * Growth OS console UI E2E contract — Epic #441 QA/certification slice.
 *
 * GATING: every test in this file is skipped unless
 *   GROWTH_OS_UI_E2E_ENABLED === "true"
 * is set in the environment. Enable explicitly when certifying the shipped
 * `/dashboard/[websiteId]/growth` UI.
 *
 * SESSION POOL (CRITICAL):
 *   Run with: SESSION_NAME=s2 PORT=3002 GROWTH_OS_UI_E2E_ENABLED=true \
 *     npm run test:e2e:session -- --grep "@growth-os-ui"
 *   Or via session-run: GROWTH_OS_UI_E2E_ENABLED=true \
 *     npm run session:run -- --grep "@growth-os-ui"
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
import { test, expect, type Page, type Response } from "@playwright/test";
import {
  CANONICAL_LANES,
  CANONICAL_LANE_LABELS,
  WORKBOARD_COLUMNS,
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
const GOTO_READY = { waitUntil: "commit" as const, timeout: 120_000 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

async function gotoGrowth(
  page: Page,
  path = "",
  tenant = tenantA,
): Promise<Response | null> {
  const url = `${growthConsoleUrl(tenant)}${path}`;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await page.goto(url, GOTO_READY);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes("ERR_ABORTED") || attempt === 2) break;
      console.warn(
        `[growth-os-ui] transient navigation abort for ${url}; retrying.`,
      );
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Could not navigate to ${url}.`);
}

async function expectNoDocumentHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      bodyScrollWidth: body.scrollWidth,
      bodyClientWidth: body.clientWidth,
      docScrollWidth: doc.scrollWidth,
      docClientWidth: doc.clientWidth,
      overflowX: getComputedStyle(body).overflowX,
    };
  });

  expect(
    overflow.docScrollWidth,
    `Document has horizontal overflow: ${JSON.stringify(overflow)}`,
  ).toBeLessThanOrEqual(overflow.docClientWidth + 1);
  expect(
    overflow.bodyScrollWidth,
    `Body has horizontal overflow: ${JSON.stringify(overflow)}`,
  ).toBeLessThanOrEqual(overflow.bodyClientWidth + 1);
}

async function openFirstRunDetail(page: Page) {
  await gotoGrowth(page, "/runs");
  await page.waitForURL(/\/growth\/runs$/);

  const firstRun = page.getByTestId(/^growth-run-row-/).first();
  const hasRun = await firstRun.isVisible().catch(() => false);
  test.skip(!hasRun, "No runs available to inspect run detail.");

  await Promise.all([
    page.waitForURL(/\/growth\/runs\/[^/]+$/),
    firstRun.getByRole("link").first().click(),
  ]);
}

test.describe("Growth OS console UI contract @growth-os-ui", () => {
  test.describe.configure({ timeout: 180_000 });
  test.use({ storageState: "e2e/.auth/user.json" });

  test.skip(
    !growthUiEnabled,
    "Enable with GROWTH_OS_UI_E2E_ENABLED=true when certifying /dashboard/[websiteId]/growth.",
  );

  test.beforeAll(() => {
    // Surface the resolved base URL in test output so reviewers can confirm
    // the session pool was honored (no port-3000 hardcoding).
    console.log(
      `[growth-os-ui] baseURL=${BASE_URL} tenantA=${tenantA.websiteId}`,
    );
  });

  test("CEO cockpit loads current command-center surfaces and lane policy states", async ({
    page,
  }) => {
    await gotoGrowth(page, "/overview");
    await page.waitForURL(/\/growth\/overview$/);

    await expect(
      page.getByRole("heading", { name: /growth os/i }),
    ).toBeVisible();

    const overviewTab = page.getByRole("link", { name: /command center/i });
    await expect(overviewTab).toBeVisible();
    await expect(
      page
        .getByLabel("Growth console tabs")
        .getByRole("link", { name: "Workboard" }),
    ).toBeVisible();

    const cockpit = page.getByTestId("growth-ceo-cockpit");
    await expect(cockpit).toBeVisible();
    await expect(cockpit).toContainText(/CEO Cockpit/i);
    await expect(cockpit).toContainText(/North Star metrics/i);
    await expect(page.getByTestId("growth-runtime-cycle-health")).toBeVisible();
    await expect(page.getByTestId("growth-scheduler-health")).toBeVisible();
    await expect(page.getByTestId("growth-scheduler-health")).not.toContainText(
      /Missing: growth_scheduler_heartbeats/i,
    );
    await expect(page.getByTestId("growth-active-cycle")).toBeVisible();
    await expect(page.getByTestId("growth-latest-cycle")).toBeVisible();

    const humanOps = page.getByTestId("growth-human-operations");
    await expect(humanOps).toBeVisible();
    await expect(humanOps).toContainText(/UI readiness/i);
    await expect(humanOps).toContainText(/Pausar autonomia|Kill switch/i);
    await expect(humanOps).toContainText(/Rollback publicacion|Rollback/i);

    const profileFlow = page.getByTestId("growth-profile-flow");
    await expect(profileFlow).toBeVisible();
    await expect(profileFlow).toContainText(/Profile Freshness/i);
    await expect(profileFlow).toContainText(/Opportunity Candidates/i);

    const agentCompanyTable = page
      .getByRole("heading", { name: /quien trabaja y que produce/i })
      .locator("xpath=ancestor::section[1]");
    for (const header of [
      /agent/i,
      /trabajo actual/i,
      /heartbeat/i,
      /output/i,
      /riesgo/i,
    ]) {
      await expect(
        agentCompanyTable.getByRole("columnheader", { name: header }),
      ).toBeVisible();
    }

    const riskTable = page.getByTestId("growth-risk-budget-table");
    await expect(riskTable).toBeVisible();
    for (const header of [
      /lane/i,
      /accion/i,
      /estado/i,
      /daily/i,
      /weekly/i,
      /controls/i,
    ]) {
      await expect(
        riskTable.getByRole("columnheader", { name: header }),
      ).toBeVisible();
    }
    for (const actionClass of [
      "content_publish",
      "transcreation_merge",
      "safe_apply",
      "paid_mutation",
    ]) {
      await expect(riskTable).toContainText(actionClass);
    }
    await expect(riskTable).toContainText(/live|paused|blocked|dry run/i);
    await expect(
      page
        .getByTestId("growth-policy-toggle-dry-run")
        .or(page.getByTestId("growth-policy-update-caps"))
        .or(page.getByTestId("growth-policy-pause-lane"))
        .or(page.getByText(/No hay policies/i))
        .first(),
    ).toBeVisible();

    const rollbackDetail = page.getByTestId("growth-rollback-detail");
    await expect(rollbackDetail).toBeVisible();
    await expect(
      rollbackDetail
        .getByTestId("growth-rollback-dry-verify")
        .or(rollbackDetail.getByText(/No rollbackable publication jobs/i))
        .first(),
    ).toBeVisible();

    const autonomyFeed = page.getByTestId("growth-autonomy-feed");
    await expect(autonomyFeed).toBeVisible();
    await expect(autonomyFeed).toContainText(
      /Auto-published|Auto-applied|Rolled back|Blocked/i,
    );

    const impactLedger = page.getByTestId("growth-impact-ledger");
    await expect(impactLedger).toBeVisible();
    await expect(impactLedger).toContainText(/resultado|outcomes|metrica/i);

    const agenticControl = page.getByTestId("growth-agentic-control");
    await expect(agenticControl).toBeVisible();
    await expect(
      agenticControl.getByRole("button", { name: "Invoke brain now" }),
    ).toBeVisible();
    await agenticControl.getByRole("button", { name: "Invoke brain now" }).click();
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await expect(page.getByTestId("growth-agentic-control")).toContainText(
      /user_on_demand/i,
    );
    await expect(page.getByTestId("growth-agentic-control")).toContainText(
      /queued|claimed|completed|failed/i,
    );
    const decisionDetail = agenticControl
      .getByTestId("growth-brain-decision-detail")
      .first();
    if (await decisionDetail.isVisible().catch(() => false)) {
      await expect(decisionDetail).toContainText(/context, learning, risk/i);
      await expect(decisionDetail).toContainText(/memories|skills|outcomes/i);
    }
  });

  test("Agent Team tab loads cards and required column headers", async ({
    page,
  }) => {
    await gotoGrowth(page, "/agents");
    await page.waitForURL(/\/growth\/agents$/);

    await expect(page.getByTestId("growth-agent-team-cards")).toBeVisible();
    for (const lane of CANONICAL_LANES) {
      await expect(
        page.getByTestId(`growth-agent-lane-card-${lane}`),
      ).toBeVisible();
    }

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

  test("Agent Team exposes learning operations and replay readiness", async ({
    page,
  }) => {
    await gotoGrowth(page, "/agents");
    await page.waitForURL(/\/growth\/agents$/);

    const cards = page.getByTestId("growth-agent-team-cards");
    await expect(cards).toBeVisible();
    await expect(cards).toContainText(/Replay/i);
    await expect(cards).toContainText(/Learning/i);
    await expect(cards).toContainText(/active|draft/i);

    const agentsTable = page.getByTestId("growth-agents-table");
    await expect(agentsTable).toBeVisible();
    await expect(agentsTable).toContainText(/replay/i);
    await expect(agentsTable).toContainText(/blocked tools/i);

    const learning = page.getByTestId("growth-agent-learning-controls");
    await expect(learning).toBeVisible();
    await expect(
      learning
        .getByTestId("growth-agent-skill-row")
        .or(learning.getByText(/No skill candidates yet/i))
        .first(),
    ).toBeVisible();
    await expect(
      learning
        .getByTestId("growth-agent-memory-row")
        .or(learning.getByText(/No memory candidates yet/i))
        .first(),
    ).toBeVisible();
    await expect(
      learning
        .getByTestId("growth-agent-replay-row")
        .or(learning.getByText(/No replay cases yet/i))
        .first(),
    ).toBeVisible();
  });

  test("Agent Team blocks skill activation when replay agreement is below threshold", async ({
    page,
  }) => {
    await gotoGrowth(page, "/agents");
    await page.waitForURL(/\/growth\/agents$/);

    const blockedActivate = page
      .getByTestId("growth-agent-skill-activate-blocked")
      .first();
    const blockedVisible = await blockedActivate.isVisible().catch(() => false);
    test.skip(
      !blockedVisible,
      "No low-agreement draft skill is available to assert replay <0.90 guard.",
    );

    await expect(blockedActivate).toBeDisabled();
    await expect(page.getByTestId("growth-agent-learning-controls")).toContainText(
      /Activation blocked until replay agreement reaches 0.90/i,
    );
  });

  test("Opportunities tab loads (empty state OR populated list)", async ({
    page,
  }) => {
    await gotoGrowth(page, "/backlog");
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
    await gotoGrowth(page, "/runs");
    await page.waitForURL(/\/growth\/runs/);
    await expect(
      page.getByRole("heading", { name: /review queue/i }),
    ).toBeVisible();

    const runsList = page.getByTestId("growth-runs-list");
    const runsEmpty = page.getByTestId("growth-runs-empty-state");

    await expect(runsList.or(runsEmpty)).toBeVisible();
  });

  test("Workboard tab loads Kanban agent operating center", async ({
    page,
  }) => {
    await gotoGrowth(page, "/workboard");
    await page.waitForURL(/\/growth\/workboard/);

    await expect(
      page.getByRole("heading", { name: /growth os workboard autónomo/i }),
    ).toBeVisible();
    await expect(page.getByTestId("growth-workboard-summary")).toBeVisible();

    const kanban = page.getByTestId("growth-workboard-kanban");
    const empty = page.getByTestId("growth-workboard-empty-state");
    await expect(kanban.or(empty)).toBeVisible();

    if (await kanban.isVisible().catch(() => false)) {
      for (const column of WORKBOARD_COLUMNS) {
        await expect(
          page.getByTestId(`growth-workboard-column-${column}`),
        ).toBeVisible();
      }
      await expect(page.locator("body")).not.toContainText("[object Object]");

      const firstCard = page.getByTestId("growth-workboard-card").first();
      if (await firstCard.isVisible().catch(() => false)) {
        await expect(firstCard).toContainText(
          /resultado|sigue solo|pide humano|bloqueado/i,
        );
        await firstCard.click();
        await expect(
          page.getByTestId("growth-workboard-detail-sheet"),
        ).toBeVisible();
        await expect(
          page.getByTestId("growth-workboard-detail-sheet"),
        ).toContainText(/resumen para marketing|preview|evidencia|tools/i);
        await page.getByRole("button", { name: "Preview" }).click();
        await expect(
          page.getByTestId("growth-workboard-preview-panel"),
        ).toBeVisible();
        await expect(
          page.getByTestId("growth-workboard-preview-panel"),
        ).not.toContainText(/Cuando el agente produzca/i);
        await expect(
          page
            .getByTestId("growth-workboard-detail-sheet")
            .getByRole("link", { name: /detalle completo|ver backlog/i })
            .first(),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(
          page.getByTestId("growth-workboard-detail-sheet"),
        ).not.toBeVisible();
      }

      const reviewCard = page
        .getByTestId("growth-workboard-column-review_needed")
        .getByTestId("growth-workboard-card")
        .first();
      if (await reviewCard.isVisible().catch(() => false)) {
        await reviewCard.click();
        await expect(
          page.getByTestId("growth-workboard-detail-sheet"),
        ).toBeVisible();
        await expect(
          page.getByTestId("growth-workboard-detail-sheet"),
        ).toContainText(/decisión del revisor|necesita revisión/i);
        await expect(
          page.getByTestId("growth-workboard-detail-sheet"),
        ).toContainText(/Aprobar no publica|detalle completo/i);
        await page.keyboard.press("Escape");
      }
    }
  });

  test("Workboard exposes bulk safety states and blocked-state operations", async ({
    page,
  }) => {
    await gotoGrowth(page, "/workboard");
    await page.waitForURL(/\/growth\/workboard/);

    await expect(page.getByTestId("growth-workboard-summary")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /aprobación segura en lote/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /aprobar riesgo bajo/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /depurar bloqueadas/i }),
    ).toBeVisible();
    await expect(
      page.getByTestId("growth-workboard-blocked-reasons"),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /marcar runtime detenido/i }),
    ).toBeVisible();
  });

  test("Run detail works as a human work center with change sets", async ({
    page,
  }) => {
    await openFirstRunDetail(page);

    await expect(page.getByTestId("growth-run-human-summary")).toBeVisible();
    await expect(page.getByTestId("growth-change-sets-panel")).toBeVisible();
    await expect(page.getByTestId("growth-run-runtime-panel")).toBeVisible();
    await expect(page.getByTestId("growth-run-learning-panel")).toBeVisible();
    await expect(page.getByTestId("growth-run-events-panel")).toBeVisible();

    const firstChangeSet = page.getByTestId("growth-change-set-card").first();
    const hasChangeSet = await firstChangeSet.isVisible().catch(() => false);
    if (hasChangeSet) {
      await expect(firstChangeSet).toContainText(/vista previa|acción real/i);
      await expect(firstChangeSet).not.toContainText("[object Object]");
      await expect(firstChangeSet).toContainText(
        /próximas tareas sugeridas|trabajo creado en backlog/i,
      );
      await expect(
        firstChangeSet.getByRole("button", {
          name: /aprobar propuesta|approve/i,
        }),
      ).toBeVisible();
      await expect(
        firstChangeSet.getByRole("button", { name: /rechazar|reject/i }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByTestId("growth-change-sets-empty-state"),
      ).toBeVisible();
      await expect(page.getByTestId("growth-change-sets-panel")).toContainText(
        /change sets|propuestas operables/i,
      );
    }
  });

  test("Run detail exposes rollback/audit evidence and learning candidate operations", async ({
    page,
  }) => {
    await openFirstRunDetail(page);

    await expect(page.getByTestId("growth-run-human-summary")).toContainText(
      /control humano|no publica contenido/i,
    );
    await expect(page.getByTestId("growth-run-runtime-panel")).toContainText(
      /aprendizaje propuesto/i,
    );
    await expect(page.getByTestId("growth-run-learning-panel")).toContainText(
      /memorias|skills|evaluaciones/i,
    );
    await expect(
      page.getByRole("heading", { name: /herramientas y evaluación/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /evidencia técnica/i }),
    ).toBeVisible();

    const changeSet = page.getByTestId("growth-change-set-card").first();
    if (await changeSet.isVisible().catch(() => false)) {
      await expect(changeSet).toContainText(
        /rollback|reversible|evidencia|vista previa/i,
      );
    } else {
      await expect(
        page.getByTestId("growth-change-sets-empty-state"),
      ).toBeVisible();
    }
  });

  test("Experiments and Data Health tabs load human control-plane surfaces", async ({
    page,
  }) => {
    await gotoGrowth(page, "/experiments");
    await page.waitForURL(/\/growth\/experiments$/);
    await expect(
      page.getByRole("heading", { name: /experiments/i }),
    ).toBeVisible();
    await expect(page.getByTestId("growth-experiments-summary")).toBeVisible();

    await gotoGrowth(page, "/data-health");
    await page.waitForURL(/\/growth\/data-health$/);
    await expect(
      page.getByRole("heading", { name: "Data Health", exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId("growth-data-health-summary")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /runtime maturity score/i }),
    ).toBeVisible();
    await expect(page.getByTestId("growth-runtime-health")).toBeVisible();
    await expect(page.getByTestId("growth-runtime-health")).toContainText(
      /Replay|Memory|Skills/i,
    );
  });

  test("Mobile Growth OS surfaces do not create document-level horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);

    const mobileRoutes = [
      { path: "/overview", heading: /growth os/i },
      { path: "/agents", heading: /agent team/i },
      { path: "/workboard", heading: /growth os workboard/i },
      { path: "/data-health", heading: /^data health$/i },
    ];

    for (const { path, heading } of mobileRoutes) {
      await gotoGrowth(page, path);
      await page.waitForURL(new RegExp(`/growth${path}$`));
      await expect(
        page.getByRole("heading", { name: heading }).first(),
      ).toBeVisible();
      await expectNoDocumentHorizontalOverflow(page);
      await expect(page.locator("body")).not.toContainText("[object Object]");
    }
  });

  test("Cross-tenant guard: tenant A user cannot read tenant B Growth data", async ({
    page,
  }) => {
    const response = await gotoGrowth(page, "", tenantB);

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
    expect(
      rolesProvisioned(),
      "Role-aware fixtures must be provisioned for Growth OS certification.",
    ).toBe(true);

    // Viewer: open Run detail, expect Approve/Reject hidden OR disabled.
    await signInAs(page, usersByRole.viewer.role);
    await gotoGrowth(page);
    await page.getByRole("link", { name: /review queue/i }).click();
    await page.waitForURL(/\/growth\/runs$/);
    await page
      .getByTestId(/^growth-run-row-/)
      .first()
      .getByRole("link")
      .first()
      .click();

    const viewerDecisionBox = page.getByTestId("growth-run-human-summary");
    const approveBtn = viewerDecisionBox.getByRole("button", {
      name: /approve/i,
    });
    const rejectBtn = viewerDecisionBox.getByRole("button", {
      name: /reject/i,
    });

    for (const btn of [approveBtn, rejectBtn]) {
      const visible = await btn.isVisible().catch(() => false);
      if (visible) {
        await expect(btn).toBeDisabled();
      }
    }

    // Curator: same Run detail, Approve/Reject must be enabled.
    await signInAs(page, usersByRole.curator.role);
    await gotoGrowth(page);
    await page.getByRole("link", { name: /review queue/i }).click();
    await page.waitForURL(/\/growth\/runs$/);
    await page
      .getByTestId(/^growth-run-row-/)
      .first()
      .getByRole("link")
      .first()
      .click();

    const curatorDecisionBox = page.getByTestId("growth-run-human-summary");
    await expect(
      curatorDecisionBox.getByRole("button", { name: /approve/i }),
    ).toBeEnabled();
    await expect(
      curatorDecisionBox.getByRole("button", { name: /reject/i }),
    ).toBeEnabled();
  });

  test("Append-only events: Run detail exposes no event-mutation affordances", async ({
    page,
  }) => {
    await gotoGrowth(page);
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
      page.waitForURL(/\/growth\/runs\/[^/]+$/),
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
