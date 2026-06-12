// F8 — Vista publica de itinerario (guest, sin login).
// Verifica preview publico y registro de pasajero anonimo contra Supabase.

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

type PublicGuestTarget = {
  accountId: string;
  itineraryId: string;
  itemId: string;
  lang: "es" | "en";
  productName: string;
};

type PublicPaymentTarget = {
  amount: number;
  currency: string;
  itineraryId: string;
  lang: "es" | "en";
  onlinePaymentEnabled: boolean;
  paymentId: string;
  paymentNumber: number;
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

async function findPublicGuestTarget(): Promise<PublicGuestTarget | null> {
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
    .select("id,language,passenger_count")
    .eq("account_id", accountId)
    .eq("itinerary_visibility", true)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (itineraryError) throw itineraryError;

  for (const itinerary of itineraries ?? []) {
    const itineraryId = itinerary.id as string;
    const expectedPassengers = Math.max(
      Number(itinerary.passenger_count ?? 1),
      1,
    );

    const [{ count: passengerCount, error: passengerError }, { data: items, error: itemError }] =
      await Promise.all([
        supabase
          .from("passenger")
          .select("id", { count: "exact", head: true })
          .eq("account_id", accountId)
          .eq("itinerary_id", itineraryId),
        supabase
          .from("itinerary_items")
          .select("id,product_name,rate_name,product_type")
          .eq("account_id", accountId)
          .eq("id_itinerary", itineraryId)
          .is("deleted_at", null)
          .limit(1),
      ]);

    if (passengerError) throw passengerError;
    if (itemError) throw itemError;
    if ((passengerCount ?? 0) >= expectedPassengers || !items?.[0]) {
      continue;
    }

    const item = items[0];
    return {
      accountId,
      itineraryId,
      itemId: item.id as string,
      lang: normalizeLanguage(itinerary.language as string | null),
      productName:
        (item.product_name as string | null) ||
        (item.rate_name as string | null) ||
        (item.product_type as string | null) ||
        "Servicio",
    };
  }

  return null;
}

async function findPublicPaymentTarget(): Promise<PublicPaymentTarget | null> {
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
    .select("id,language,active_payment_method")
    .eq("account_id", accountId)
    .eq("itinerary_visibility", true)
    .is("deleted_at", null)
    .limit(40);

  if (itineraryError) throw itineraryError;

  for (const itinerary of itineraries ?? []) {
    const { data: schedules, error: scheduleError } = await supabase
      .from("itinerary_payment_schedule")
      .select("id,currency")
      .eq("itinerary_id", itinerary.id as string)
      .limit(1);

    if (scheduleError) throw scheduleError;
    const schedule = schedules?.[0];
    if (!schedule) continue;

    const { data: payments, error: paymentError } = await supabase
      .from("scheduled_payments")
      .select("id,amount,currency,payment_number,status")
      .eq("schedule_id", schedule.id as string)
      .neq("status", "paid")
      .order("payment_number", { ascending: true })
      .limit(1);

    if (paymentError) throw paymentError;
    const payment = payments?.[0];
    if (!payment) continue;

    return {
      amount: Number(payment.amount ?? 0),
      currency: (payment.currency as string | null) || (schedule.currency as string) || "COP",
      itineraryId: itinerary.id as string,
      lang: normalizeLanguage(itinerary.language as string | null),
      onlinePaymentEnabled:
        (itinerary.active_payment_method as string | null)?.trim().toLowerCase() ===
        "stripe",
      paymentId: payment.id as string,
      paymentNumber: Number(payment.payment_number ?? 1),
    };
  }

  return null;
}

test.describe("Evolucion F8 — vista publica guest", () => {
  test.setTimeout(120_000);
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase service role no definido para elegir target F8 publico",
  );

  test("renderiza sin login y registra pasajero anonimo", async ({ page }) => {
    const supabase = serviceClient();
    const target = await findPublicGuestTarget();
    test.skip(!supabase || !target, "No hay itinerario publico demo con cupo");
    if (!supabase || !target) return;

    const uniqueDocument = `PW-F8-${Date.now()}`;

    try {
      await page.goto(
        `/${target.lang}/view/${target.itineraryId}?hideEmptyDays=true`,
        GOTO_READY,
      );

      await expect(page.getByTestId("public-itinerary-view")).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByTestId("public-itinerary-url")).toContainText(
        `/${target.lang}/view/${target.itineraryId}?hideEmptyDays=true`,
      );
      await expect(
        page.getByTestId(`public-itinerary-item-${target.itemId}`),
      ).toContainText(target.productName);
      await expect(page.getByTestId("public-passenger-form")).toBeVisible();

      await page.getByTestId("public-passenger-first-name").fill("Playwright");
      await page.getByTestId("public-passenger-last-name").fill("Guest");
      await page
        .getByTestId("public-passenger-document-number")
        .fill(uniqueDocument);
      await page
        .getByTestId("public-passenger-nationality")
        .fill("Colombiana");
      await page.getByTestId("public-passenger-birth-date").fill("1990-01-01");
      await page
        .getByTestId("public-passenger-email")
        .fill(`guest-${Date.now()}@example.test`);
      await page.getByTestId("public-passenger-phone").fill("+573001112233");
      await page
        .getByTestId("public-passenger-terms")
        .setChecked(true, { force: true });
      await expect(page.getByTestId("public-passenger-terms")).toBeChecked();
      await page.getByTestId("public-passenger-submit").click();

      await page.waitForURL("**guestPassenger=created", { timeout: 60_000 });
      await expect(page.getByTestId("public-passenger-success")).toBeVisible();

      const { data: rows, error } = await supabase
        .from("passenger")
        .select("id,name,last_name,account_id,itinerary_id,number_id")
        .eq("account_id", target.accountId)
        .eq("itinerary_id", target.itineraryId)
        .eq("number_id", uniqueDocument)
        .limit(1);

      if (error) throw error;
      expect(rows?.[0]).toMatchObject({
        account_id: target.accountId,
        itinerary_id: target.itineraryId,
        last_name: "Guest",
        name: "Playwright",
        number_id: uniqueDocument,
      });
    } finally {
      await supabase
        .from("passenger")
        .delete()
        .eq("account_id", target.accountId)
        .eq("itinerary_id", target.itineraryId)
        .eq("number_id", uniqueDocument);
    }
  });

  test("muestra cuotas publicas y abre landing de pago validada", async ({
    page,
  }) => {
    const target = await findPublicPaymentTarget();
    test.skip(!target, "No hay itinerario publico demo con cuotas pendientes");
    if (!target) return;

    await page.goto(
      `/${target.lang}/view/${target.itineraryId}?hideEmptyDays=true`,
      GOTO_READY,
    );

    await expect(page.getByTestId("public-payment-summary")).toBeVisible({
      timeout: 60_000,
    });
    await expect(
      page.getByTestId(`public-payment-installment-${target.paymentId}`),
    ).toContainText(String(target.paymentNumber));

    const paymentUrl = `/${target.lang}/payment/pay?itinerary_id=${target.itineraryId}&scheduled_payment_id=${target.paymentId}`;

    if (target.onlinePaymentEnabled) {
      const paymentLink = page.getByTestId(`public-payment-link-${target.paymentId}`);
      await expect(paymentLink).toHaveAttribute("href", paymentUrl);
      await paymentLink.click();
    } else {
      await page.goto(paymentUrl, GOTO_READY);
    }

    await page.waitForURL(
      `**${paymentUrl}`,
      { timeout: 60_000 },
    );
    await expect(page.getByTestId("public-payment-page")).toBeVisible();
    await expect(page.getByTestId("public-payment-installment-label")).toContainText(
      String(target.paymentNumber),
    );
    await expect(page.getByTestId("public-payment-amount")).toBeVisible();
    if (target.onlinePaymentEnabled) {
      await expect(page.getByTestId("public-payment-checkout")).toBeVisible();
    } else {
      await expect(page.getByTestId("public-payment-disabled")).toBeVisible();
    }
  });
});
