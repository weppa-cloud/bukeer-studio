// F1 — UX visual core real-demo.
// Verifica que CRM/contactos/itinerarios renderizan sin friccion visual basica
// en desktop y mobile: sin pantalla en blanco, overlay, errores JS ni overflow.

import { expect, test, type Page } from "@playwright/test";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";

const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };
const FRAMEWORK_OVERLAY_TEXT = [
  "Unhandled Runtime Error",
  "Build Error",
  "Hydration failed",
  "Application error",
  "This page could not be found",
];

const CORE_ROUTES = [
  {
    name: "itineraries list",
    path: "/admin/itineraries",
    rootTestId: "admin-next-itineraries-list",
  },
  {
    name: "contacts list",
    path: "/admin/contacts",
    rootTestId: "admin-next-contacts-grid",
  },
  {
    name: "crm conversations",
    path: "/admin/conversations",
    rootTestId: "admin-next-conversations-layout",
  },
] as const;

const VIEWPORTS = [
  ["desktop", { width: 1440, height: 960 }],
  ["mobile", { width: 390, height: 844 }],
] as const;

async function loginAsDemo(page: Page, nextPath: string) {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`, GOTO_READY);
  await page.waitForSelector('[data-testid="login-email"]', {
    timeout: 60_000,
  });
  await expect(page.getByTestId("login-submit")).toHaveAttribute(
    "data-hydrated",
    "true",
    { timeout: 60_000 },
  );
  await page.getByTestId("login-email").fill(DEMO_EMAIL);
  await page.getByTestId("login-password").fill(DEMO_PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(`**${nextPath}**`, { timeout: 60_000 });
  await expect(page.getByTestId("admin-next-evo-shell")).toBeVisible({
    timeout: 60_000,
  });
}

async function inspectCurrentSurface(
  page: Page,
  label: string,
  rootTestId: string,
) {
  await expect(page.getByTestId("admin-next-evo-shell")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId(rootTestId)).toBeVisible({ timeout: 60_000 });

  const bodyText = await page.locator("body").innerText({ timeout: 10_000 });
  expect(bodyText.trim().length, `${label} body text`).toBeGreaterThan(300);
  for (const marker of FRAMEWORK_OVERLAY_TEXT) {
    expect(bodyText, `${label} should not show framework overlay`).not.toContain(
      marker,
    );
  }

  const layout = await page.evaluate(
    (testId) => ({
      bodyTextLength: document.body.innerText.trim().length,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      shellClass: document
        .querySelector('[data-testid="admin-next-evo-shell"]')
        ?.getAttribute("class"),
      hiddenRoot:
        document
          .querySelector(`[data-testid="${CSS.escape(testId)}"]`)
          ?.getBoundingClientRect().width === 0,
    }),
    rootTestId,
  );

  expect(layout.bodyTextLength, `${label} meaningful body`).toBeGreaterThan(300);
  expect(layout.shellClass, `${label} Evolucion shell`).toContain("t-evo");
  expect(layout.hiddenRoot, `${label} root width`).toBe(false);
  expect(
    layout.scrollWidth,
    `${label} horizontal overflow ${layout.scrollWidth}/${layout.viewportWidth}`,
  ).toBeLessThanOrEqual(layout.viewportWidth + 2);
}

test.describe("Evolucion F1 — UX visual core CRM/itinerarios (demo)", () => {
  test.setTimeout(180_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");

  for (const [viewportName, viewport] of VIEWPORTS) {
    test(`${viewportName} renderiza core CRM/itinerarios sin friccion visual`, async ({
      page,
    }) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await page.setViewportSize(viewport);
      await loginAsDemo(page, "/admin/itineraries");

      for (const route of CORE_ROUTES) {
        await page.goto(route.path, GOTO_READY);
        await inspectCurrentSurface(
          page,
          `${viewportName} ${route.name}`,
          route.rootTestId,
        );
      }

      await page.goto("/admin/itineraries", GOTO_READY);
      const firstItinerary = page
        .locator('[data-testid^="admin-next-itinerary-"]')
        .first();
      await expect(firstItinerary).toBeVisible({ timeout: 60_000 });
      await firstItinerary.click();
      await page.waitForURL("**/admin/itineraries/*", { timeout: 60_000 });
      await inspectCurrentSurface(
        page,
        `${viewportName} itinerary detail`,
        "admin-next-itinerary-detail-page",
      );

      await page.goto("/admin/contacts", GOTO_READY);
      const firstContact = page
        .locator('[data-testid^="admin-next-contact-"]')
        .first();
      await expect(firstContact).toBeVisible({ timeout: 60_000 });
      await firstContact.click();
      await page.waitForURL("**/admin/contacts/*", { timeout: 60_000 });
      await inspectCurrentSurface(
        page,
        `${viewportName} contact detail`,
        "admin-next-contact-detail",
      );

      expect(pageErrors, `${viewportName} page errors`).toEqual([]);
      expect(
        consoleErrors.filter(
          (message) =>
            !message.includes("favicon") &&
            !message.includes("Failed to load resource"),
        ),
        `${viewportName} console errors`,
      ).toEqual([]);
    });
  }
});
