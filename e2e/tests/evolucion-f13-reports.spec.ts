// F13 — Reportes: hub financiero real desde itineraries, itinerary_items y transactions.

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";
const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };
const READONLY_REPORT_LIMIT = 250;

type DemoReportTarget = {
  expectedRevenue: string;
  itineraryId: string;
  itineraryName: string;
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

async function findReportTarget(): Promise<DemoReportTarget | null> {
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

  const since = toIsoDate(addDays(new Date(), -90));
  const { data: itineraries, error: itineraryError } = await supabase
    .from("itineraries")
    .select("id,name,id_fm,total_amount,deleted_at,created_at")
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(READONLY_REPORT_LIMIT);

  if (itineraryError) throw itineraryError;
  const rows = itineraries ?? [];
  if (rows.length === 0) return null;

  const revenue = rows.reduce(
    (sum, row) => sum + numberValue(row.total_amount as number | string | null),
    0,
  );
  const first = rows
    .slice()
    .sort(
      (left, right) =>
        numberValue(right.total_amount as number | string | null) -
        numberValue(left.total_amount as number | string | null),
    )
    .find((row) => row.id && (row.name || row.id_fm));
  if (!first) return null;

  return {
    expectedRevenue: formatMoney(revenue),
    itineraryId: first.id as string,
    itineraryName: ((first.name as string | null) || (first.id_fm as string | null) || first.id) as string,
  };
}

function numberValue(value: number | string | null): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value.trim().replaceAll(",", ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatMoney(amount: number): string {
  return `$${Math.round(amount).toLocaleString("es-CO")}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

test.describe("Evolucion F13 — reportes reales (demo)", () => {
  test.setTimeout(120_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase service role no definido para elegir target F13",
  );

  test("muestra hub de reportes con cifras reales del backend compartido", async ({ page }) => {
    const target = await findReportTarget();
    test.skip(!target, "No hay itinerarios demo recientes para F13");
    if (!target) return;

    await loginAsDemo(page, "/admin/reports?report=sales&range=90d");

    await expect(page.getByTestId("admin-next-reports-root")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("admin-next-report-card-sales")).toContainText(
      target.expectedRevenue,
    );
    await expect(page.getByTestId("admin-next-reports-detail")).toContainText(
      "Ventas",
    );
    await expect(page.getByTestId("admin-next-reports-insights")).toContainText(
      "Backend compartido",
    );
    await expect(
      page.getByTestId(`admin-next-reports-row-${target.itineraryId}`),
    ).toContainText(target.itineraryName);
  });
});
