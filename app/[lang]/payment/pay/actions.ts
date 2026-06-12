"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

const CreatePublicCheckoutSchema = z.object({
  itineraryId: z.string().uuid(),
  lang: z.enum(["es", "en"]),
  scheduledPaymentId: z
    .preprocess(
      (value) => (value === null ? "" : value),
      z.string().uuid().or(z.literal("")),
    )
    .optional(),
});

type CheckoutResponse = {
  checkout_url?: string;
  url?: string;
};

export async function createPublicCheckoutSessionAction(formData: FormData) {
  const parsed = CreatePublicCheckoutSchema.safeParse({
    itineraryId: formData.get("itineraryId"),
    lang: formData.get("lang"),
    scheduledPaymentId: formData.get("scheduledPaymentId"),
  });

  const lang = formData.get("lang") === "en" ? "en" : "es";
  const itineraryId = String(formData.get("itineraryId") ?? "");
  const scheduledPaymentId = String(formData.get("scheduledPaymentId") ?? "");
  const retryPath =
    `/${lang}/payment/pay?itinerary_id=${encodeURIComponent(itineraryId)}` +
    (scheduledPaymentId
      ? `&scheduled_payment_id=${encodeURIComponent(scheduledPaymentId)}`
      : "");

  if (!parsed.success) {
    redirect(`${retryPath}&paymentError=validation`);
  }

  let checkoutUrl = "";

  try {
    const requestHeaders = await headers();
    const origin = getRequestOrigin(requestHeaders);
    const successUrl = buildPaymentResultUrl({
      itineraryId: parsed.data.itineraryId,
      kind: "success",
      lang: parsed.data.lang,
      origin,
      scheduledPaymentId: parsed.data.scheduledPaymentId || undefined,
    });
    const cancelUrl = buildPaymentResultUrl({
      itineraryId: parsed.data.itineraryId,
      kind: "cancel",
      lang: parsed.data.lang,
      origin,
      scheduledPaymentId: parsed.data.scheduledPaymentId || undefined,
    });
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase.functions.invoke(
      "create-checkout-session",
      {
        body: {
          cancel_url: cancelUrl,
          itinerary_id: parsed.data.itineraryId,
          scheduled_payment_id: parsed.data.scheduledPaymentId || undefined,
          success_url: successUrl,
        },
      },
    );

    if (error) {
      throw new Error(error.message || "No se pudo iniciar checkout");
    }

    const responseData = data as {
      checkout_url?: string;
      data?: CheckoutResponse;
      success?: boolean;
      error?: string;
      url?: string;
    } | null;
    checkoutUrl =
      responseData?.data?.checkout_url ??
      responseData?.data?.url ??
      responseData?.checkout_url ??
      responseData?.url ??
      "";

    if (!responseData?.success || !checkoutUrl) {
      throw new Error(responseData?.error || "Checkout no disponible");
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Checkout no disponible";
    redirect(
      `${retryPath}&paymentError=${encodeURIComponent(message.slice(0, 160))}`,
    );
  }

  redirect(checkoutUrl);
}

function buildPaymentResultUrl({
  itineraryId,
  kind,
  lang,
  origin,
  scheduledPaymentId,
}: {
  itineraryId: string;
  kind: "success" | "cancel";
  lang: "es" | "en";
  origin: string;
  scheduledPaymentId?: string;
}) {
  const query = new URLSearchParams({ itinerary_id: itineraryId });
  if (scheduledPaymentId) query.set("scheduled_payment_id", scheduledPaymentId);
  if (kind === "success") query.set("session_id", "{CHECKOUT_SESSION_ID}");

  return `${origin}/${lang}/payment/${kind}?${query.toString()}`;
}

function getRequestOrigin(requestHeaders: Headers) {
  const host =
    requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  if (!host) {
    return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  }

  return `${protocol}://${host}`;
}
