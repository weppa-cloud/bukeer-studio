// F4 — Items de itinerario read-only (primer slice de paridad Flutter → Next).
// Verifica que Next muestra items reales de itinerary_items con tipo, proveedor,
// fuente, reserva y cálculo económico sobre el mismo backend Supabase que Flutter.

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";
const ENABLE_WRITE_E2E =
  process.env.ADMIN_NEXT_E2E_WRITE_ITINERARY_ITEMS === "true";

const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

type DemoItineraryItemTarget = {
  accountId: string;
  itineraryId: string;
  itemId: string;
  productName: string;
  productType: string;
};

async function loginAsDemo(page: Page, itineraryId: string) {
  await page.goto(`/login?next=/admin/itineraries/${itineraryId}`, GOTO_READY);
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
  await page.waitForURL(`**/admin/itineraries/${itineraryId}`, {
    timeout: 60_000,
  });
  await expect(page.getByTestId("admin-next-evo-shell")).toBeVisible({
    timeout: 60_000,
  });
}

async function findDemoItineraryItem(): Promise<DemoItineraryItemTarget | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: contacts, error: contactError } = await supabase
    .from("contacts")
    .select("account_id")
    .eq("email", DEMO_EMAIL)
    .is("deleted_at", null)
    .limit(1);

  if (contactError) throw contactError;
  const accountId = contacts?.[0]?.account_id as string | undefined;
  if (!accountId) return null;

  const { data: items, error: itemError } = await supabase
    .from("itinerary_items")
    .select(
      "id,id_itinerary,product_name,product_type,provider_contact_id,total_cost,total_price,itineraries!inner(id,name,account_id,deleted_at)",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .eq("itineraries.account_id", accountId)
    .is("itineraries.deleted_at", null)
    .not("provider_contact_id", "is", null)
    .not("total_cost", "is", null)
    .not("total_price", "is", null)
    .limit(1);

  if (itemError) throw itemError;
  const item = items?.[0];
  if (!item) return null;

  return {
    accountId,
    itineraryId: item.id_itinerary as string,
    itemId: item.id as string,
    productName: item.product_name as string,
    productType: item.product_type as string,
  };
}

async function findDemoPendingItineraryItem(): Promise<DemoItineraryItemTarget | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: contacts, error: contactError } = await supabase
    .from("contacts")
    .select("account_id")
    .eq("email", DEMO_EMAIL)
    .is("deleted_at", null)
    .limit(1);

  if (contactError) throw contactError;
  const accountId = contacts?.[0]?.account_id as string | undefined;
  if (!accountId) return null;

  const { data: items, error: itemError } = await supabase
    .from("itinerary_items")
    .select(
      "id,id_itinerary,product_name,product_type,itineraries!inner(id,name,account_id,deleted_at)",
    )
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .eq("reservation_status", false)
    .eq("itineraries.account_id", accountId)
    .is("itineraries.deleted_at", null)
    .limit(1);

  if (itemError) throw itemError;
  const item = items?.[0];
  if (!item) return null;

  return {
    accountId,
    itineraryId: item.id_itinerary as string,
    itemId: item.id as string,
    productName: item.product_name as string,
    productType: item.product_type as string,
  };
}

async function resetReservationStatus(target: DemoItineraryItemTarget) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase
    .from("itinerary_items")
    .update({ reservation_status: false })
    .eq("account_id", target.accountId)
    .eq("id_itinerary", target.itineraryId)
    .eq("id", target.itemId);

  if (error) throw error;
}

async function readReservationStatus(target: DemoItineraryItemTarget) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("itinerary_items")
    .select("reservation_status")
    .eq("account_id", target.accountId)
    .eq("id_itinerary", target.itineraryId)
    .eq("id", target.itemId)
    .maybeSingle();

  if (error) throw error;
  return data?.reservation_status ?? null;
}

async function createTemporaryItineraryItem(): Promise<DemoItineraryItemTarget | null> {
  const baseTarget =
    (await findDemoPendingItineraryItem()) ?? (await findDemoItineraryItem());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!baseTarget || !url || !serviceKey) return null;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const itemId = randomUUID();
  const productName = `[E2E][F4] Item delete ${Date.now().toString(36)}`;

  const { error } = await supabase.from("itinerary_items").insert({
    id: itemId,
    account_id: baseTarget.accountId,
    id_itinerary: baseTarget.itineraryId,
    product_name: productName,
    product_type: "Servicios",
    rate_name: "E2E temporal",
    date: "2026-07-10",
    day_number: 1,
    order: 9999,
    destination: "E2E",
    quantity: 1,
    unit_cost: 0,
    unit_price: 0,
    total_cost: 0,
    total_price: 0,
    profit: 0,
    reservation_status: false,
    needs_review: false,
    channel_code: "admin_next_e2e",
  });

  if (error) throw error;

  return {
    accountId: baseTarget.accountId,
    itineraryId: baseTarget.itineraryId,
    itemId,
    productName,
    productType: "Servicios",
  };
}

async function readItineraryItemExists(target: DemoItineraryItemTarget) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("itinerary_items")
    .select("id")
    .eq("account_id", target.accountId)
    .eq("id_itinerary", target.itineraryId)
    .eq("id", target.itemId)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data?.id);
}

async function deleteTemporaryItineraryItem(target: DemoItineraryItemTarget) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error } = await supabase
    .from("itinerary_items")
    .delete()
    .eq("account_id", target.accountId)
    .eq("id_itinerary", target.itineraryId)
    .eq("id", target.itemId);

  if (error) throw error;
}

test.describe("Evolución F4 — items de itinerario read-only (demo)", () => {
  test.setTimeout(90_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");

  test("muestra item real con tipo, proveedor, fuente, reserva y totales", async ({
    page,
  }) => {
    const target = await findDemoItineraryItem();
    test.skip(
      !target,
      "No hay service role o item demo con proveedor/costos para F4 read-only",
    );

    await loginAsDemo(page, target!.itineraryId);
    await expect(
      page.getByTestId("admin-next-itinerary-tab-panel-services"),
    ).toBeVisible({ timeout: 60_000 });

    const item = page.getByTestId(`admin-next-detail-item-${target!.itemId}`);
    await expect(item).toBeVisible({ timeout: 60_000 });
    await expect(item).toContainText(target!.productName);
    await expect(
      page.getByTestId(`admin-next-detail-item-type-${target!.itemId}`),
    ).toContainText(target!.productType);
    await expect(
      page.getByTestId(`admin-next-detail-item-source-${target!.itemId}`),
    ).toContainText(/Catálogo V2|Manual|Package Kit|bukeer/i);
    await expect(
      page.getByTestId(`admin-next-detail-item-reservation-${target!.itemId}`),
    ).toContainText(/Pendiente|Reservado|Confirmado/i);
    await expect(
      page.getByTestId(`admin-next-detail-item-provider-${target!.itemId}`),
    ).not.toContainText("Proveedor no asignado");
    await expect(
      page.getByTestId(`admin-next-detail-item-cost-${target!.itemId}`),
    ).toContainText("$");
    await expect(
      page.getByTestId(`admin-next-detail-item-price-${target!.itemId}`),
    ).toContainText("$");
    await expect(
      page.getByTestId(`admin-next-detail-item-markup-${target!.itemId}`),
    ).toContainText("$");
  });

  test("confirma reserva de item real y restaura el estado demo", async ({
    page,
  }) => {
    test.skip(
      !ENABLE_WRITE_E2E,
      "ADMIN_NEXT_E2E_WRITE_ITINERARY_ITEMS no habilitado",
    );
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY no definido para cleanup",
    );

    const target = await findDemoPendingItineraryItem();
    test.skip(!target, "No hay item demo pendiente para confirmar");

    try {
      await loginAsDemo(page, target!.itineraryId);
      await expect(
        page.getByTestId(`admin-next-detail-item-${target!.itemId}`),
      ).toBeVisible({ timeout: 60_000 });
      await expect(
        page.getByTestId(
          `admin-next-detail-item-reservation-${target!.itemId}`,
        ),
      ).toContainText("Pendiente");

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response
              .url()
              .includes(`/admin/itineraries/${target!.itineraryId}`) &&
            response.request().method() === "POST",
          { timeout: 60_000 },
        ),
        page
          .getByTestId(`admin-next-detail-item-confirm-${target!.itemId}`)
          .click(),
      ]);
      await page.waitForURL(`**/admin/itineraries/${target!.itineraryId}`, {
        timeout: 60_000,
      });
      await expect(
        page.getByTestId(
          `admin-next-detail-item-reservation-${target!.itemId}`,
        ),
      ).toContainText("Reservado", { timeout: 60_000 });
      await expect(
        page.getByTestId(`admin-next-detail-item-confirm-${target!.itemId}`),
      ).toBeDisabled();

      await expect.poll(() => readReservationStatus(target!)).toBe(true);
    } finally {
      if (target) {
        await resetReservationStatus(target);
        await expect.poll(() => readReservationStatus(target)).toBe(false);
      }
    }
  });

  test("elimina item temporal real desde la UI y deja la BD limpia", async ({
    page,
  }) => {
    test.skip(
      !ENABLE_WRITE_E2E,
      "ADMIN_NEXT_E2E_WRITE_ITINERARY_ITEMS no habilitado",
    );
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY no definido para cleanup",
    );

    const target = await createTemporaryItineraryItem();
    test.skip(!target, "No se pudo crear item temporal demo para eliminar");

    try {
      await loginAsDemo(page, target!.itineraryId);
      const item = page.getByTestId(`admin-next-detail-item-${target!.itemId}`);
      await expect(item).toBeVisible({ timeout: 60_000 });
      await expect(item).toContainText(target!.productName);
      await expect(readItineraryItemExists(target!)).resolves.toBe(true);

      await Promise.all([
        page.waitForResponse(
          (response) =>
            response
              .url()
              .includes(`/admin/itineraries/${target!.itineraryId}`) &&
            response.request().method() === "POST",
          { timeout: 60_000 },
        ),
        page
          .getByTestId(`admin-next-detail-item-delete-${target!.itemId}`)
          .click(),
      ]);
      await page.waitForURL(`**/admin/itineraries/${target!.itineraryId}`, {
        timeout: 60_000,
      });
      await expect(
        page.getByTestId(`admin-next-detail-item-${target!.itemId}`),
      ).toHaveCount(0, { timeout: 60_000 });
      await expect.poll(() => readItineraryItemExists(target!)).toBe(false);
    } finally {
      if (target && (await readItineraryItemExists(target))) {
        await deleteTemporaryItineraryItem(target);
      }
      if (target) {
        await expect.poll(() => readItineraryItemExists(target)).toBe(false);
      }
    }
  });
});
