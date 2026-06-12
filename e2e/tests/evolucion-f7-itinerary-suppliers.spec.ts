// F7 — Proveedores de itinerario (paridad Flutter → Next).
// Verifica agrupación real por proveedor y confirmación reversible de reserva.

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";
const ENABLE_WRITE_E2E = process.env.ADMIN_NEXT_E2E_WRITE_SUPPLIERS === "true";

const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

type DemoSupplierTarget = {
  accountId: string;
  itineraryId: string;
  itemId: string;
  productName: string;
  providerName: string;
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function loginAsDemo(page: Page, itineraryId: string) {
  await page.goto(
    `/login?next=/admin/itineraries/${itineraryId}?tab=suppliers`,
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

async function findConfirmableSupplierItem(): Promise<DemoSupplierTarget | null> {
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
      "id,id_itinerary,product_name,provider_contact_id,reservation_status,provider:contacts!provider_contact_id(name,last_name),itinerary:itineraries!id_itinerary(id,status,deleted_at)",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .not("provider_contact_id", "is", null)
    .eq("reservation_status", false)
    .limit(10);

  if (error) throw error;

  const row = data?.find((item) => {
    const itinerary = item.itinerary as
      | { deleted_at?: string | null; status?: string | null }
      | null
      | undefined;
    return (
      itinerary &&
      !itinerary.deleted_at &&
      (itinerary.status === "Confirmado" || itinerary.status === "Finalizado")
    );
  });

  if (!row) return null;

  const provider = row.provider as
    | { name?: string | null; last_name?: string | null }
    | null
    | undefined;
  const providerName = [provider?.name, provider?.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    accountId,
    itineraryId: row.id_itinerary as string,
    itemId: row.id as string,
    productName: (row.product_name as string | null) ?? "Servicio",
    providerName: providerName || "Proveedor asignado",
  };
}

async function setReservationStatus(
  target: DemoSupplierTarget,
  value: boolean,
) {
  const supabase = serviceClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("itinerary_items")
    .update({ reservation_status: value })
    .eq("account_id", target.accountId)
    .eq("id_itinerary", target.itineraryId)
    .eq("id", target.itemId);

  if (error) throw error;
}

async function readReservationStatus(
  target: DemoSupplierTarget,
): Promise<boolean | null> {
  const supabase = serviceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("itinerary_items")
    .select("reservation_status")
    .eq("account_id", target.accountId)
    .eq("id_itinerary", target.itineraryId)
    .eq("id", target.itemId)
    .maybeSingle();

  if (error) throw error;
  return (data?.reservation_status as boolean | null | undefined) ?? null;
}

test.describe("Evolución F7 — proveedores de itinerario (demo)", () => {
  test.setTimeout(120_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");
  test.skip(!ENABLE_WRITE_E2E, "ADMIN_NEXT_E2E_WRITE_SUPPLIERS no habilitado");
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase service role no definido para verificar BD",
  );

  test("agrupa proveedores reales y confirma una reserva desde la pestaña Proveedores", async ({
    page,
  }) => {
    const target = await findConfirmableSupplierItem();
    test.skip(!target, "No hay item demo confirmable con proveedor para F7");
    if (!target) return;

    await setReservationStatus(target, false);

    try {
      await loginAsDemo(page, target.itineraryId);
      await page.goto(
        `/admin/itineraries/${target.itineraryId}?tab=suppliers`,
        GOTO_READY,
      );
      await expect(
        page.getByTestId("admin-next-itinerary-tab-panel-suppliers"),
      ).toBeVisible({ timeout: 60_000 });
      await expect(page.getByText(target.providerName)).toBeVisible();
      await expect(
        page.getByTestId(`admin-next-supplier-item-${target.itemId}`),
      ).toContainText(target.productName);
      await expect(
        page.getByTestId(`admin-next-supplier-item-${target.itemId}`),
      ).toContainText("Pendiente");

      await page
        .getByTestId(`admin-next-supplier-confirm-${target.itemId}`)
        .click();
      await page.waitForURL(
        `**/admin/itineraries/${target.itineraryId}?tab=suppliers`,
        { timeout: 60_000 },
      );

      await expect
        .poll(() => readReservationStatus(target), { timeout: 30_000 })
        .toBe(true);

      await expect(
        page.getByTestId(`admin-next-supplier-item-${target.itemId}`),
      ).toContainText("Reservado", { timeout: 60_000 });
    } finally {
      await setReservationStatus(target, false);
      await expect
        .poll(() => readReservationStatus(target), { timeout: 10_000 })
        .toBe(false);
    }
  });
});
