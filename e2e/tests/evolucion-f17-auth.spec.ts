// F17 — Auth completo: superficies de registro, forgot/reset, verificación, MFA y demo code.

import { expect, test } from "@playwright/test";

const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";
const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 120_000 };

test.describe("Evolucion F17 — auth completo", () => {
  test.setTimeout(180_000);

  test("login enlaza registro, forgot password y demo code", async ({
    page,
  }) => {
    await page.goto("/login?next=/admin/dashboard", GOTO_READY);

    await expect(page.getByTestId("login-email")).toBeVisible();
    await expect(page.getByTestId("login-register")).toHaveAttribute(
      "href",
      "/register",
    );
    await expect(page.getByTestId("login-forgot-password")).toHaveAttribute(
      "href",
      "/forgot-password",
    );
    await expect(page.getByTestId("login-demo-code")).toHaveAttribute(
      "href",
      "/demo-code?next=%2Fadmin%2Fdashboard",
    );
  });

  test("registro queda gated por invitation code sin crear usuarios", async ({
    page,
  }) => {
    await page.goto("/register", GOTO_READY);

    await expect(page.getByTestId("auth-register-form")).toBeVisible();
    await page
      .getByTestId("auth-register-email")
      .fill("f17-new-user@example.com");
    await page.getByTestId("auth-register-password").fill("password123");
    await page.getByTestId("auth-register-invite-code").fill("wrong-code");
    await expect(page.getByTestId("auth-register-submit")).toHaveAttribute(
      "data-hydrated",
      "true",
      { timeout: 60_000 },
    );
    await page.getByTestId("auth-register-submit").click();

    await expect(page.getByTestId("auth-register-error")).toContainText(
      /Invitation code/i,
      { timeout: 30_000 },
    );
  });

  test("forgot, reset y verify-email renderizan estados de recuperacion", async ({
    page,
  }) => {
    await page.goto("/forgot-password", GOTO_READY);
    await expect(page.getByTestId("auth-forgot-password-root")).toBeVisible();
    await expect(page.getByTestId("auth-forgot-password-email")).toBeVisible();

    await page.goto("/reset-password", GOTO_READY);
    await expect(page.getByTestId("auth-reset-password-root")).toBeVisible();
    await expect(
      page.getByTestId("auth-reset-password-submit"),
    ).toHaveAttribute("data-hydrated", "true", { timeout: 60_000 });
    await page.getByTestId("auth-reset-password-new").fill("password123");
    await page.getByTestId("auth-reset-password-confirm").fill("password456");
    await page.getByTestId("auth-reset-password-submit").click();
    await expect(page.getByTestId("auth-reset-password-error")).toContainText(
      /do not match/i,
    );

    await page.goto("/verify-email", GOTO_READY);
    await expect(page.getByTestId("auth-verify-email-root")).toContainText(
      /Verify your email/i,
    );
  });

  test("MFA setup protege usuarios sin sesion", async ({ page }) => {
    await page.goto("/mfa", GOTO_READY);

    await expect(page.getByTestId("auth-mfa-root")).toBeVisible();
    await expect(page.getByTestId("auth-mfa-signed-out")).toContainText(
      /Sign in before setting up MFA/i,
      { timeout: 60_000 },
    );
  });

  test("demo code abre Admin Next con la cuenta demo", async ({ page }) => {
    test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");

    await page.goto("/demo-code?next=/admin/dashboard", GOTO_READY);
    await expect(page.getByTestId("auth-demo-code-form")).toBeVisible();
    await expect(page.getByTestId("auth-demo-code-submit")).toHaveAttribute(
      "data-hydrated",
      "true",
      { timeout: 60_000 },
    );
    await page.getByTestId("auth-demo-code-input").fill("demo-e2e");
    await page.getByTestId("auth-demo-code-submit").click();

    await page.waitForURL("**/admin/dashboard**", {
      timeout: 120_000,
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByTestId("admin-next-evo-shell")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("admin-next-dashboard-kpis")).toBeVisible({
      timeout: 60_000,
    });
  });
});
