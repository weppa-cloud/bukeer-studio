// F6 — Pagos de itinerario (paridad Flutter → Next).
// Verifica create/edit/delete real sobre public.transactions con demo@demo.bukeer.com.

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";
const ENABLE_WRITE_E2E = process.env.ADMIN_NEXT_E2E_WRITE_PAYMENTS === "true";

const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

type DemoPaymentTarget = {
  accountId: string;
  itineraryId: string;
};

type TransactionRow = {
  id: string | number;
  account_id: string;
  id_itinerary: string;
  date: string | null;
  value: number | null;
  payment_method: string | null;
  type: string | null;
  reference: string | null;
  voucher_url: string | null;
  total_paid: number | null;
  deleted_at: string | null;
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
    `/login?next=/admin/itineraries/${itineraryId}?tab=payments`,
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

async function findDemoItinerary(): Promise<DemoPaymentTarget | null> {
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

  const { data: itineraries, error: itineraryError } = await supabase
    .from("itineraries")
    .select("id")
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (itineraryError) throw itineraryError;
  const itineraryId = itineraries?.[0]?.id as string | undefined;
  if (!itineraryId) return null;

  return { accountId, itineraryId };
}

async function readActiveTransactionByReference(
  target: DemoPaymentTarget,
  reference: string,
): Promise<TransactionRow | null> {
  const supabase = serviceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id,account_id,id_itinerary,date,value,payment_method,type,reference,voucher_url,total_paid,deleted_at",
    )
    .eq("account_id", target.accountId)
    .eq("id_itinerary", target.itineraryId)
    .eq("reference", reference)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return (data as TransactionRow | null) ?? null;
}

async function deleteE2ETransactions(target: DemoPaymentTarget) {
  const supabase = serviceClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("account_id", target.accountId)
    .eq("id_itinerary", target.itineraryId)
    .like("reference", "[E2E][F6]%");

  if (error) throw error;
}

test.describe("Evolución F6 — pagos de itinerario write parity (demo)", () => {
  test.setTimeout(120_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");
  test.skip(!ENABLE_WRITE_E2E, "ADMIN_NEXT_E2E_WRITE_PAYMENTS no habilitado");
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase service role no definido para verificar BD",
  );

  test("crea, edita y elimina un pago temporal real desde la UI", async ({
    page,
  }) => {
    const target = await findDemoItinerary();
    test.skip(!target, "No hay itinerario demo disponible para F6");
    if (!target) return;

    const suffix = Date.now().toString(36);
    const reference = `[E2E][F6] ${suffix}`;
    const editedReference = `[E2E][F6] ${suffix} edit`;

    await deleteE2ETransactions(target);

    try {
      await loginAsDemo(page, target.itineraryId);
      await page.goto(
        `/admin/itineraries/${target.itineraryId}?tab=payments`,
        GOTO_READY,
      );
      await expect(
        page.getByTestId("admin-next-itinerary-tab-panel-payments"),
      ).toBeVisible({ timeout: 60_000 });

      if (
        !(await page.getByTestId("admin-next-payment-value-new").isVisible())
      ) {
        await page.getByTestId("admin-next-payment-add-toggle").click();
      }
      await page.getByTestId("admin-next-payment-date-new").fill("2026-07-04");
      await page.getByTestId("admin-next-payment-value-new").fill("1500000");
      await page
        .getByTestId("admin-next-payment-method-new")
        .fill("Transferencia bancaria");
      await page.getByTestId("admin-next-payment-type-new").selectOption({
        value: "ingreso",
      });
      await page
        .getByTestId("admin-next-payment-reference-new")
        .fill(reference);
      await page
        .getByTestId("admin-next-payment-voucher-new")
        .fill("https://cdn.example.test/f6-voucher.pdf");
      await page.getByTestId("admin-next-payment-save-new").click();

      await page.waitForURL(
        `**/admin/itineraries/${target.itineraryId}?tab=payments`,
        { timeout: 60_000 },
      );

      await expect
        .poll(() => readActiveTransactionByReference(target, reference), {
          timeout: 30_000,
        })
        .not.toBeNull();

      const createdRow = await readActiveTransactionByReference(
        target,
        reference,
      );
      expect(createdRow).toMatchObject({
        account_id: target.accountId,
        id_itinerary: target.itineraryId,
        payment_method: "Transferencia bancaria",
        reference,
        total_paid: 1500000,
        type: "ingreso",
        value: 1500000,
        voucher_url: "https://cdn.example.test/f6-voucher.pdf",
      });
      const transactionId = String(createdRow?.id ?? "");
      expect(transactionId).toBeTruthy();
      if (!transactionId) return;

      await page.goto(
        `/admin/itineraries/${target.itineraryId}?tab=payments`,
        GOTO_READY,
      );
      await expect(
        page.getByTestId(`admin-next-payment-${transactionId}`),
      ).toContainText(reference);

      await page
        .getByTestId(`admin-next-payment-edit-toggle-${transactionId}`)
        .click();
      await page
        .getByTestId(`admin-next-payment-value-${transactionId}`)
        .fill("1750000");
      await page
        .getByTestId(`admin-next-payment-reference-${transactionId}`)
        .fill(editedReference);
      await page
        .getByTestId(`admin-next-payment-save-${transactionId}`)
        .click();
      await page.waitForURL(
        `**/admin/itineraries/${target.itineraryId}?tab=payments`,
        { timeout: 60_000 },
      );

      await expect
        .poll(() => readActiveTransactionByReference(target, editedReference), {
          timeout: 30_000,
        })
        .toMatchObject({ total_paid: 1750000, value: 1750000 });

      const editedRow = await readActiveTransactionByReference(
        target,
        editedReference,
      );
      expect(String(editedRow?.id ?? "")).toBe(transactionId);

      await page.goto(
        `/admin/itineraries/${target.itineraryId}?tab=payments`,
        GOTO_READY,
      );
      await page.getByTestId(`admin-next-payment-${transactionId}`).waitFor();
      await page
        .getByTestId(`admin-next-payment-delete-${transactionId}`)
        .click();
      await page.waitForURL(
        `**/admin/itineraries/${target.itineraryId}?tab=payments`,
        { timeout: 60_000 },
      );

      await expect
        .poll(() => readActiveTransactionByReference(target, editedReference), {
          timeout: 30_000,
        })
        .toBeNull();
      await expect(
        page.getByTestId(`admin-next-payment-${transactionId}`),
      ).toHaveCount(0);
    } finally {
      await deleteE2ETransactions(target);
      await expect
        .poll(() => readActiveTransactionByReference(target, reference), {
          timeout: 10_000,
        })
        .toBeNull();
      await expect
        .poll(() => readActiveTransactionByReference(target, editedReference), {
          timeout: 10_000,
        })
        .toBeNull();
    }
  });
});
