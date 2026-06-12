// F2 — Itinerarios detalle read-only (epic Evolución, bukeer-studio#612).
// Abre un itinerario real de la cuenta demo y recorre las 5 pestañas del prototipo.

import { expect, test, type Page } from "@playwright/test";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";

const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

async function loginAsDemo(page: Page) {
  await page.goto("/login?next=/admin/itineraries", GOTO_READY);
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
  await page.waitForURL("**/admin/itineraries**", { timeout: 60_000 });
  await expect(page.getByTestId("admin-next-evo-shell")).toBeVisible({
    timeout: 60_000,
  });
}

test.describe("Evolución F2 — itinerario detalle read-only (demo)", () => {
  test.setTimeout(90_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");

  test("abre detalle real y recorre Items/Pasajeros/Pagos/Proveedores/Preview", async ({
    page,
  }) => {
    await loginAsDemo(page);
    await expect(page.getByTestId("admin-next-itineraries-list")).toBeVisible();

    const firstItinerary = page
      .locator('[data-testid^="admin-next-itinerary-"]')
      .first();
    await expect(firstItinerary).toBeVisible();
    await firstItinerary.click();

    await page.waitForURL("**/admin/itineraries/*", { timeout: 60_000 });
    await expect(
      page.getByTestId("admin-next-itinerary-detail-page"),
    ).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("admin-next-itinerary-detail")).toBeVisible();
    await expect(
      page.getByTestId("admin-next-itinerary-audit-trail"),
    ).toBeVisible();

    await expect(
      page.getByTestId("admin-next-itinerary-tab-panel-services"),
    ).toBeVisible();

    const tabs = [
      ["passengers", "admin-next-itinerary-tab-panel-passengers"],
      ["payments", "admin-next-itinerary-tab-panel-payments"],
      ["suppliers", "admin-next-itinerary-tab-panel-suppliers"],
      ["preview", "admin-next-itinerary-tab-panel-preview"],
      ["services", "admin-next-itinerary-tab-panel-services"],
    ] as const;

    for (const [tab, panel] of tabs) {
      const expectedUrl =
        tab === "services"
          ? /\/admin\/itineraries\/[0-9a-f-]{36}$/i
          : new RegExp(`/admin/itineraries/[0-9a-f-]{36}\\?tab=${tab}$`, "i");

      await Promise.all([
        page.waitForURL(expectedUrl, {
          timeout: 60_000,
        }),
        page.getByTestId(`admin-next-itinerary-tab-${tab}`).click(),
      ]);
      await expect(page.getByTestId(panel)).toBeVisible({ timeout: 30_000 });
    }
  });
});
