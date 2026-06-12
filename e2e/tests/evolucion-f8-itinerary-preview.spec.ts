// F8 — Preview de itinerario (paridad Flutter -> Next).
// Verifica timeline readonly con items reales y link publico por idioma.

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";

const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };
const FEE_BANCARIO_PRODUCT_IDS = new Set([
  "615a5eda-7560-4506-abf1-67a362dbafba",
  "f8f7b780-fa93-4c64-8525-02e81f425e5d",
]);

type DemoPreviewTarget = {
  itineraryId: string;
  itemId: string;
  productName: string;
  productType: string;
  expectedPublicPath: string;
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function normalizeLanguage(language: string | null | undefined): "es" | "en" {
  const normalized = language?.trim().toLowerCase();
  return normalized === "en" ||
    normalized === "english" ||
    normalized === "ingles"
    ? "en"
    : "es";
}

async function loginAsDemo(page: Page, itineraryId: string) {
  await page.goto(
    `/login?next=/admin/itineraries/${itineraryId}?tab=preview`,
    GOTO_READY,
  );
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
  await page.waitForURL(`**/admin/itineraries/${itineraryId}**`, {
    timeout: 60_000,
  });
  await expect(page.getByTestId("admin-next-evo-shell")).toBeVisible({
    timeout: 60_000,
  });
}

async function findPreviewTarget(): Promise<DemoPreviewTarget | null> {
  const supabase = serviceClient();
  if (!supabase) return null;

  const { data: contacts, error: contactError } = await supabase
    .from("contacts")
    .select("account_id")
    .eq("email", DEMO_EMAIL)
    .is("deleted_at", null)
    .limit(1);

  if (contactError) throw contactError;
  const accountId = contacts?.[0]?.account_id as string | undefined;
  if (!accountId) return null;

  const { data, error } = await supabase
    .from("itinerary_items")
    .select(
      "id,id_itinerary,product_type,product_name,rate_name,id_product,date,itinerary:itineraries!id_itinerary(id,language,deleted_at)",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .not("date", "is", null)
    .order("date", { ascending: true })
    .limit(40);

  if (error) throw error;

  const row = data?.find((item) => {
    const itinerary = item.itinerary as { deleted_at?: string | null } | null;
    const productId = (item.id_product as string | null | undefined)?.trim();
    const productName = (item.product_name as string | null | undefined)
      ?.trim()
      .toLowerCase();
    const rateName = (item.rate_name as string | null | undefined)
      ?.trim()
      .toLowerCase();
    return (
      itinerary &&
      !itinerary.deleted_at &&
      !(productId && FEE_BANCARIO_PRODUCT_IDS.has(productId)) &&
      productName !== "fee bancario" &&
      rateName !== "fee bancario"
    );
  });

  if (!row) return null;
  const itinerary = row.itinerary as { language?: string | null };
  const lang = normalizeLanguage(itinerary.language);
  const productName =
    (row.product_name as string | null) ||
    (row.rate_name as string | null) ||
    (row.product_type as string | null) ||
    "Servicio";

  return {
    itineraryId: row.id_itinerary as string,
    itemId: row.id as string,
    productName,
    productType: (row.product_type as string | null) || "Servicio",
    expectedPublicPath: `/${lang}/view/${row.id_itinerary as string}?hideEmptyDays=true`,
  };
}

test.describe("Evolución F8 — preview de itinerario (demo)", () => {
  test.setTimeout(120_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase service role no definido para elegir target F8",
  );

  test("renderiza timeline preview con item real y link publico", async ({
    page,
  }) => {
    const target = await findPreviewTarget();
    test.skip(!target, "No hay item demo con fecha para preview F8");
    if (!target) return;

    await loginAsDemo(page, target.itineraryId);
    await page.goto(
      `/admin/itineraries/${target.itineraryId}?tab=preview`,
      GOTO_READY,
    );

    await expect(
      page.getByTestId("admin-next-itinerary-tab-panel-preview"),
    ).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("admin-next-preview-stats")).toBeVisible();
    await expect(page.getByTestId("admin-next-preview-public-link")).toHaveText(
      target.expectedPublicPath,
    );
    await expect(
      page.getByTestId(`admin-next-preview-item-${target.itemId}`),
    ).toContainText(target.productName);
    await expect(
      page.getByTestId(`admin-next-preview-item-${target.itemId}`),
    ).toContainText(target.productType);
    await expect(
      page.getByTestId("admin-next-preview-pdf-proposal"),
    ).toBeEnabled();
    await expect(
      page.getByTestId("admin-next-preview-pdf-account"),
    ).toBeEnabled();
  });
});
