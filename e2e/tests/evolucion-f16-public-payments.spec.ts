// F16 — Pagos publicos: landing de payment link + retornos success/cancel.
// No ejecuta cobros reales; valida rutas publicas contra una cuota Stripe demo.

import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

type PublicStripePaymentTarget = {
  amount: number;
  currency: string;
  itineraryId: string;
  lang: "es" | "en";
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

async function findPublicStripePaymentTarget(): Promise<PublicStripePaymentTarget | null> {
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
    .eq("active_payment_method", "stripe")
    .is("deleted_at", null)
    .limit(50);

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
      currency:
        (payment.currency as string | null) ||
        (schedule.currency as string) ||
        "COP",
      itineraryId: itinerary.id as string,
      lang: normalizeLanguage(itinerary.language as string | null),
      paymentId: payment.id as string,
      paymentNumber: Number(payment.payment_number ?? 1),
    };
  }

  return null;
}

test.describe("Evolucion F16 — pagos publicos Stripe (demo)", () => {
  test.setTimeout(120_000);
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase service role no definido para elegir target F16",
  );

  test("expone payment link, success y cancel para una cuota publica", async ({
    page,
  }) => {
    const target = await findPublicStripePaymentTarget();
    test.skip(!target, "No hay cuota publica Stripe pendiente para F16");
    if (!target) return;

    const paymentUrl = `/${target.lang}/payment/pay?itinerary_id=${target.itineraryId}&scheduled_payment_id=${target.paymentId}`;
    const successUrl = `/${target.lang}/payment/success?itinerary_id=${target.itineraryId}&scheduled_payment_id=${target.paymentId}&session_id=cs_test_f16`;
    const cancelUrl = `/${target.lang}/payment/cancel?itinerary_id=${target.itineraryId}&scheduled_payment_id=${target.paymentId}`;

    await page.goto(paymentUrl, GOTO_READY);
    await expect(page.getByTestId("public-payment-page")).toBeVisible({
      timeout: 60_000,
    });
    await expect(
      page.getByTestId("public-payment-installment-label"),
    ).toContainText(String(target.paymentNumber));
    await expect(page.getByTestId("public-payment-amount")).toBeVisible();
    await expect(page.getByTestId("public-payment-checkout")).toBeVisible();

    await page.goto(successUrl, GOTO_READY);
    await expect(page.getByTestId("public-payment-success-page")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("public-payment-status")).toContainText(
      /Webhook|Pagado|Paid/,
    );
    await expect(page.getByTestId("public-payment-session")).toContainText(
      "cs_test_f16",
    );
    await expect(
      page.getByTestId("public-payment-result-installment"),
    ).toContainText(String(target.paymentNumber));

    await page.goto(cancelUrl, GOTO_READY);
    await expect(page.getByTestId("public-payment-cancel-page")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("public-payment-retry")).toHaveAttribute(
      "href",
      paymentUrl,
    );
  });
});
