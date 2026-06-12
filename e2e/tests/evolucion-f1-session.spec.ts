// F1 — Sesión y navegación (epic Evolución flow-first, bukeer-studio#612).
// Login UI real con la cuenta demo autorizada y recorrido de los módulos
// con el shell Evolución exacto al prototipo. Credenciales SIEMPRE por env.

import { expect, test, type Page } from "@playwright/test";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";

const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

async function loginAsDemo(page: Page) {
  await page.goto("/login?next=/admin/dashboard", GOTO_READY);
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
  await page.waitForURL("**/admin/dashboard**", { timeout: 60_000 });
  await expect(page.getByTestId("admin-next-evo-shell")).toBeVisible({
    timeout: 60_000,
  });
}

test.describe("Evolución F1 — sesión y navegación (demo)", () => {
  test.setTimeout(90_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");

  test("login demo + shell Evolución + navegación entre módulos", async ({
    page,
  }) => {
    await loginAsDemo(page);

    // Shell Evolución exacto al prototipo
    const shell = page.getByTestId("admin-next-evo-shell");
    await expect(shell).toBeVisible();
    await expect(page.getByTestId("admin-next-evo-logo")).toBeVisible();
    await expect(page.getByTestId("admin-next-evo-cmdk")).toBeVisible();
    await expect(page.getByTestId("admin-next-dashboard-kpis")).toBeVisible();

    // i18n + multi-moneda transversal: preferencias persistidas y evento live.
    await expect(page.getByTestId("admin-next-market-switch")).toBeVisible();
    await expect(page.getByTestId("admin-next-nav-contacts")).toContainText(
      "Contactos",
    );
    await page.getByTestId("admin-next-language-en").click();
    await expect(page.getByTestId("admin-next-evo-cmdk")).toContainText(
      "Search itineraries",
    );
    await expect(page.getByTestId("admin-next-nav-contacts")).toContainText(
      "Contacts",
    );
    await page.keyboard.press("ControlOrMeta+K");
    await expect(page.getByTestId("admin-next-cmdk-dialog")).toBeVisible();
    await page.getByTestId("admin-next-cmdk-input").fill("reports");
    await expect(
      page.getByTestId("admin-next-cmdk-item-reports"),
    ).toContainText("Reports");
    await page.getByTestId("admin-next-cmdk-veil").click();
    await page.getByTestId("admin-next-currency-USD").click();
    await expect(page.getByTestId("admin-next-market-preview")).toContainText(
      "$3,100",
    );
    const preferenceEvent = page.evaluate(
      () =>
        new Promise((resolve) => {
          window.addEventListener(
            "bukeer:evo-market-preferences",
            (event) => resolve((event as CustomEvent).detail),
            { once: true },
          );
        }),
    );
    await page.getByTestId("admin-next-currency-COP").click();
    await expect
      .poll(async () =>
        page.getByTestId("admin-next-market-preview").textContent(),
      )
      .toContain("COP");
    expect(await preferenceEvent).toEqual({
      currency: "COP",
      language: "en",
    });
    await expect
      .poll(() =>
        page.evaluate(() => ({
          currency: window.localStorage.getItem(
            "bukeer-admin-evolucion-currency",
          ),
          language: window.localStorage.getItem(
            "bukeer-admin-evolucion-language",
          ),
        })),
      )
      .toEqual({ currency: "COP", language: "en" });
    await page.getByTestId("admin-next-language-es").click();
    await expect(page.getByTestId("admin-next-nav-contacts")).toContainText(
      "Contactos",
    );

    // Notificaciones in-app transversales: no leidas, RBAC y evento realtime.
    await page.getByTestId("admin-next-notifications").click();
    await expect(
      page.getByTestId("admin-next-notifications-panel"),
    ).toBeVisible();
    await expect(
      page.getByTestId("admin-next-notifications-count"),
    ).toContainText("2 nuevas");
    await expect(
      page.getByTestId("admin-next-notification-rbac-scope"),
    ).toContainText("RBAC");
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("bukeer:evo-notification", {
          detail: {
            id: "e2e-live-agenda",
            title: "Agenda actualizada",
            description: "Servicio demo sincronizado por realtime.",
            meta: "E2E",
          },
        }),
      );
    });
    await expect(
      page.getByTestId("admin-next-notification-e2e-live-agenda"),
    ).toContainText("Agenda actualizada");
    await expect(
      page.getByTestId("admin-next-notifications-count"),
    ).toContainText("3 nuevas");
    await page.getByTestId("admin-next-notifications-mark-read").click();
    await expect(
      page.getByTestId("admin-next-notifications-count"),
    ).toContainText("0 nuevas");
    await expect(page.getByTestId("admin-next-notifications-ping")).toHaveCount(
      0,
    );
    await page.getByTestId("admin-next-notifications-veil").click();

    // Command palette transversal: ⌘K / Ctrl+K abre rutas estables por flujo.
    await page.keyboard.press("ControlOrMeta+K");
    await expect(page.getByTestId("admin-next-cmdk-dialog")).toBeVisible();
    await page.getByTestId("admin-next-cmdk-input").fill("agenda");
    await expect(page.getByTestId("admin-next-cmdk-item-agenda")).toContainText(
      "Agenda",
    );
    await Promise.all([
      page.waitForURL("**/admin/agenda**", { timeout: 60_000 }),
      page.keyboard.press("Enter"),
    ]);
    await expect(page.getByTestId("admin-next-agenda-list")).toBeVisible();

    // Navegación: Itinerarios (F2 — datos reales de la cuenta demo)
    await Promise.all([
      page.waitForURL("**/admin/itineraries**", { timeout: 60_000 }),
      page.getByTestId("admin-next-nav-itis").click(),
    ]);
    await expect(page.getByTestId("admin-next-itineraries-list")).toBeVisible();
    const rows = page.locator('[data-testid^="admin-next-itinerary-"]');
    await expect(rows.first()).toBeVisible();

    // Vista kanban vive en la URL (Principio: URL como estado)
    await page.getByTestId("admin-next-itineraries-view-kanban").click();
    await page.waitForURL("**/admin/itineraries?view=kanban**", {
      timeout: 30_000,
    });
    await expect(
      page.getByTestId("admin-next-itineraries-kanban"),
    ).toBeVisible();

    // Contactos
    await Promise.all([
      page.waitForURL("**/admin/contacts**", { timeout: 60_000 }),
      page.getByTestId("admin-next-nav-contacts").click(),
    ]);
    await expect(page.getByTestId("admin-next-contacts-grid")).toBeVisible();

    // Productos
    await Promise.all([
      page.waitForURL("**/admin/products**", { timeout: 60_000 }),
      page.getByTestId("admin-next-nav-products").click(),
    ]);
    await expect(page.getByTestId("admin-next-products-grid")).toBeVisible();

    // Conversaciones
    await Promise.all([
      page.waitForURL("**/admin/conversations**", { timeout: 60_000 }),
      page.getByTestId("admin-next-nav-conv").click(),
    ]);
    await expect(
      page.getByTestId("admin-next-conversations-layout"),
    ).toBeVisible();

    // Dark mode toggle del prototipo
    await page.getByTestId("admin-next-evo-theme-toggle").click();
    await expect(shell).toHaveClass(/dark/);
    await page.getByTestId("admin-next-evo-theme-toggle").click();
    await expect(shell).toHaveClass(/light/);
  });

  test("preferencias i18n/moneda persistidas hidratan sin mismatch", async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    await page.addInitScript(() => {
      window.localStorage.setItem("bukeer-admin-evolucion-language", "en");
      window.localStorage.setItem("bukeer-admin-evolucion-currency", "USD");
    });

    await loginAsDemo(page);

    await expect(page.getByTestId("admin-next-nav-contacts")).toContainText(
      "Contacts",
    );
    await expect(page.getByTestId("admin-next-market-preview")).toContainText(
      "$3,100",
    );
    expect(
      consoleErrors.filter((message) => message.includes("Hydration failed")),
    ).toEqual([]);
  });

  test("itinerarios muestra datos reales de la cuenta demo (no fixture)", async ({
    page,
  }) => {
    await loginAsDemo(page);
    await page.goto("/admin/itineraries", GOTO_READY);
    await expect(page.getByTestId("admin-next-itineraries-list")).toBeVisible();

    // El fixture trae exactamente 6 itinerarios hardcodeados; la cuenta demo
    // tiene 175 (readonly limit 60). Más de 6 filas = datos reales.
    const rows = page.locator('[data-testid^="admin-next-itinerary-"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(6);
  });

  test("itinerarios aplica filtros de estado y búsqueda desde la URL", async ({
    page,
  }) => {
    await loginAsDemo(page);
    await page.goto("/admin/itineraries", GOTO_READY);
    await expect(page.getByTestId("admin-next-itineraries-list")).toBeVisible();

    await Promise.all([
      page.waitForURL("**/admin/itineraries?status=quoted", {
        timeout: 60_000,
      }),
      page.getByTestId("admin-next-itineraries-status-quoted").click(),
    ]);

    const quotedRows = page.locator('[data-testid^="admin-next-itinerary-"]');
    const quotedCount = await quotedRows.count();
    expect(quotedCount).toBeGreaterThan(0);
    await expect(quotedRows.first()).toContainText("Presupuesto");

    const firstText = await quotedRows.first().innerText();
    const code = firstText.match(/ID\s+([A-Z0-9-]+)/i)?.[1];
    expect(code).toBeTruthy();

    await page.getByTestId("admin-next-itineraries-search-input").fill(code!);
    await Promise.all([
      page.waitForURL("**/admin/itineraries?status=quoted&q=*", {
        timeout: 60_000,
      }),
      page.getByTestId("admin-next-itineraries-search-input").press("Enter"),
    ]);

    const searchedRows = page.locator('[data-testid^="admin-next-itinerary-"]');
    const searchedCount = await searchedRows.count();
    expect(searchedCount).toBeGreaterThan(0);
    expect(searchedCount).toBeLessThanOrEqual(quotedCount);
    await expect(searchedRows.first()).toContainText(code!);
  });
});
