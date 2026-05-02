import { expect, test } from "@playwright/test";

const growthUiEnabled = process.env.GROWTH_OS_UI_E2E_ENABLED === "true";
const websiteId =
  process.env.E2E_WEBSITE_ID ?? "894545b7-73ca-4dae-b76a-da5b6a3f8441";

test.describe("Growth OS console UI contract @growth-os-ui", () => {
  test.skip(
    !growthUiEnabled,
    "Growth OS UI is not shipped yet. Enable with GROWTH_OS_UI_E2E_ENABLED=true when implementing /dashboard/[websiteId]/growth.",
  );

  test("loads the tenant-scoped Growth console shell", async ({ page }) => {
    await page.goto(`/dashboard/${websiteId}/growth`);

    await expect(
      page.getByRole("heading", { name: /growth os/i }),
    ).toBeVisible();
    await expect(page.getByRole("tab", { name: /overview/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /agents/i })).toBeVisible();
    await expect(page.getByRole("tab", { name: /backlog/i })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: /reviews|runs/i }),
    ).toBeVisible();
  });

  test("shows agent mode, agreement gate and protected actions", async ({
    page,
  }) => {
    await page.goto(`/dashboard/${websiteId}/growth`);
    await page.getByRole("tab", { name: /agents/i }).click();

    await expect(page.getByText(/technical remediation/i)).toBeVisible();
    await expect(
      page.getByText(/prepare only|observe only|auto-safe/i),
    ).toBeVisible();
    await expect(page.getByText(/agreement/i)).toBeVisible();
    await expect(page.getByText(/0\.90|90%/i)).toBeVisible();
    await expect(
      page.getByText(/auto-apply.*locked|auto apply.*locked/i),
    ).toBeVisible();
  });

  test("keeps backlog rows scoped to the selected tenant", async ({ page }) => {
    await page.goto(`/dashboard/${websiteId}/growth`);
    await page.getByRole("tab", { name: /backlog/i }).click();

    await expect(page.getByTestId("growth-current-website-id")).toContainText(
      websiteId,
    );
    await expect(page.getByTestId("growth-backlog-table")).toBeVisible();
    await expect(page.getByText(/source row|next action|lane/i)).toBeVisible();
  });
});
