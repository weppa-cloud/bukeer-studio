// F12 — Agenda: servicios programados reales desde itinerary_items.

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";
const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

type DemoAgendaTarget = {
  itemId: string;
  itineraryId: string;
  productName: string;
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

async function findAgendaTarget(): Promise<DemoAgendaTarget | null> {
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

  const today = new Date();
  const start = toIsoDate(addDays(today, -7));
  const end = toIsoDate(addDays(today, 60));

  const { data: items, error: itemError } = await supabase
    .from("itinerary_items")
    .select(
      "id,id_itinerary,product_name,date,itineraries!inner(id,name,account_id,deleted_at)",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .eq("itineraries.account_id", accountId)
    .is("itineraries.deleted_at", null)
    .not("date", "is", null)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true })
    .limit(20);

  if (itemError) throw itemError;
  const item = items?.find((row) => row.id && row.id_itinerary);
  if (!item) return null;

  return {
    itemId: item.id as string,
    itineraryId: item.id_itinerary as string,
    productName: (item.product_name as string | null) || "Servicio",
  };
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

test.describe("Evolucion F12 — agenda real (demo)", () => {
  test.setTimeout(120_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase service role no definido para elegir target F12",
  );

  test("muestra servicios programados reales y link al itinerario", async ({ page }) => {
    const target = await findAgendaTarget();
    test.skip(!target, "No hay servicios demo fechados para F12");
    if (!target) return;

    await loginAsDemo(page, "/admin/agenda");

    await expect(page.getByTestId("admin-next-agenda-list")).toBeVisible({
      timeout: 60_000,
    });
    const service = page.getByTestId(`admin-next-agenda-service-${target.itemId}`);
    await expect(service).toBeVisible({ timeout: 60_000 });
    await expect(service).toContainText(target.productName);
    await expect(page.getByTestId("admin-next-agenda-signals")).toBeVisible();

    const itineraryLink = page.getByTestId(`admin-next-agenda-itinerary-${target.itemId}`);
    await expect(itineraryLink).toHaveAttribute(
      "href",
      `/admin/itineraries/${target.itineraryId}`,
    );
  });
});
