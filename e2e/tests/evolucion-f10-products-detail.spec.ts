// F10 — Productos/Catálogo V2: lista readonly y detalle real contra Supabase.

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";
const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

type DemoProductTarget = {
  productId: string;
  source: "hotel" | "activity";
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

async function findProductTarget(): Promise<DemoProductTarget | null> {
  const supabase = serviceClient();
  if (!supabase) return null;

  const { data: demoContacts, error: demoError } = await supabase
    .from("contacts")
    .select("account_id")
    .eq("email", DEMO_EMAIL)
    .is("deleted_at", null)
    .limit(1);

  if (demoError) throw demoError;
  const accountId = demoContacts?.[0]?.account_id as string | undefined;
  if (!accountId) return null;

  const { data: hotels, error: hotelError } = await supabase
    .from("account_hotels")
    .select("id")
    .eq("account_id", accountId)
    .eq("is_active", true)
    .limit(10);

  if (hotelError) throw hotelError;
  const hotel = hotels?.find((row) => row.id);
  if (hotel?.id) return { productId: hotel.id as string, source: "hotel" };

  const { data: activities, error: activityError } = await supabase
    .from("account_activities")
    .select("id")
    .eq("account_id", accountId)
    .eq("is_active", true)
    .limit(10);

  if (activityError) throw activityError;
  const activity = activities?.find((row) => row.id);
  if (activity?.id) {
    return { productId: activity.id as string, source: "activity" };
  }

  return null;
}

test.describe("Evolucion F10 — productos reales (demo)", () => {
  test.setTimeout(120_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase service role no definido para elegir target F10",
  );

  test("abre detalle de producto desde lista readonly", async ({ page }) => {
    const target = await findProductTarget();
    test.skip(!target, "No hay producto demo para F10");
    if (!target) return;

    await loginAsDemo(page, "/admin/products");

    await expect(page.getByTestId("admin-next-products-grid")).toBeVisible({
      timeout: 60_000,
    });
    const card = page.getByTestId(`admin-next-product-${target.productId}`);
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("href", `/admin/products/${target.productId}`);
    await card.click();

    await page.waitForURL(`**/admin/products/${target.productId}`, {
      timeout: 60_000,
    });
    await expect(page.getByTestId("admin-next-product-detail")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("admin-next-product-gallery")).toBeVisible();
    await expect(page.getByTestId("admin-next-product-profile")).toBeVisible();
    await expect(page.getByTestId("admin-next-product-rates")).toBeVisible();
    await expect(page.getByTestId("admin-next-product-catalog")).toBeVisible();
    await expect(page.getByTestId("admin-next-product-signals")).toBeVisible();
  });
});
