import { notFound } from "next/navigation";
import { EvoIcon } from "@/components/admin-next/evolucion/icons";
import {
  getPublicItineraryById,
  type PublicItinerarySupabaseClient,
  type PublicScheduledPayment,
} from "@/lib/admin-next/public-itinerary";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { createPublicCheckoutSessionAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pago seguro | Bukeer",
};

export default async function PublicPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    itinerary_id?: string;
    paymentError?: string;
    scheduled_payment_id?: string;
  }>;
}) {
  const { lang } = await params;
  const { itinerary_id: itineraryId, paymentError, scheduled_payment_id: scheduledPaymentId } =
    await searchParams;

  if ((lang !== "es" && lang !== "en") || !itineraryId) notFound();

  const publicItinerary = await getPublicItineraryById({
    itineraryId,
    supabase:
      createSupabaseServiceRoleClient() as unknown as PublicItinerarySupabaseClient,
  });

  if (!publicItinerary) notFound();

  const selectedPayment = selectPayment(
    publicItinerary.paymentPlan.payments,
    scheduledPaymentId,
  );
  if (scheduledPaymentId && !selectedPayment) notFound();

  const amount = selectedPayment?.amount ?? publicItinerary.paymentPlan.pendingAmount;
  const currency =
    selectedPayment?.currency ?? publicItinerary.paymentPlan.currency;
  const checkoutEnabled =
    publicItinerary.paymentPlan.onlinePaymentEnabled && amount > 0;

  return (
    <main className="pub" data-testid="public-payment-page">
      <div className="pub-bar">
        <a
          className="btn outline"
          data-testid="public-payment-back"
          href={`/${lang}/view/${publicItinerary.itinerary.id}?hideEmptyDays=true`}
        >
          <EvoIcon name="back" size={16} />
          {copy(lang).back}
        </a>
        <span className="url">/{lang}/payment/pay</span>
      </div>
      <div className="pub-body">
        <div className="pub-doc">
          <section className="pub-hero">
            <div className="av s54">
              <EvoIcon name="card" size={24} />
            </div>
            <div>
              <span className="chip teal">{copy(lang).securePayment}</span>
              <h2>{publicItinerary.itinerary.name}</h2>
              <p>{copy(lang).paymentCopy}</p>
            </div>
          </section>
          <section className="card" data-testid="public-payment-card">
            <div className="sum-row">
              <h3>{copy(lang).amountToPay}</h3>
              <span className={checkoutEnabled ? "chip green" : "chip orange"}>
                {checkoutEnabled ? copy(lang).stripeReady : copy(lang).advisorPayment}
              </span>
            </div>
            <div className="bal-grid">
              <div className="bal-cell">
                <small>{copy(lang).installment}</small>
                <b data-testid="public-payment-installment-label">
                  {selectedPayment
                    ? `${copy(lang).installment} ${selectedPayment.paymentNumber}`
                    : copy(lang).pendingBalance}
                </b>
              </div>
              <div className="bal-cell">
                <small>{copy(lang).dueDate}</small>
                <b>{formatDate(selectedPayment?.dueDate ?? null, lang)}</b>
              </div>
              <div className="bal-cell">
                <small>{copy(lang).total}</small>
                <b data-testid="public-payment-amount">
                  {formatCurrency(amount, currency, lang)}
                </b>
              </div>
            </div>
            {paymentError ? (
              <div className="chip red" data-testid="public-payment-error">
                {decodeURIComponent(paymentError)}
              </div>
            ) : null}
            {checkoutEnabled ? (
              <form action={createPublicCheckoutSessionAction} className="fsec">
                <input name="itineraryId" type="hidden" value={publicItinerary.itinerary.id} />
                <input name="lang" type="hidden" value={lang} />
                <input
                  name="scheduledPaymentId"
                  type="hidden"
                  value={selectedPayment?.id ?? ""}
                />
                <button className="btn primary" data-testid="public-payment-checkout" type="submit">
                  <EvoIcon name="card" size={16} />
                  {copy(lang).continueToStripe}
                </button>
              </form>
            ) : (
              <div className="empty-card" data-testid="public-payment-disabled">
                {copy(lang).checkoutDisabled}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function selectPayment(
  payments: PublicScheduledPayment[],
  scheduledPaymentId?: string,
) {
  if (scheduledPaymentId) {
    return payments.find((payment) => payment.id === scheduledPaymentId) ?? null;
  }

  return payments.find((payment) => payment.status !== "paid") ?? null;
}

function formatDate(value: string | null, lang: "es" | "en") {
  if (!value) return copy(lang).datePending;
  return new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-CO", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatCurrency(amount: number, currency: string, lang: "es" | "en") {
  return new Intl.NumberFormat(lang === "en" ? "en-US" : "es-CO", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function copy(lang: "es" | "en") {
  if (lang === "en") {
    return {
      advisorPayment: "Advisor payment",
      amountToPay: "Amount to pay",
      back: "Back to itinerary",
      checkoutDisabled:
        "Online checkout is not enabled for this itinerary. Your advisor will share payment instructions.",
      continueToStripe: "Continue to secure checkout",
      datePending: "Date pending",
      dueDate: "Due date",
      installment: "Installment",
      paymentCopy:
        "Review the selected installment before opening the secure Stripe checkout.",
      pendingBalance: "Pending balance",
      securePayment: "Secure payment",
      stripeReady: "Stripe ready",
      total: "Total",
    };
  }

  return {
    advisorPayment: "Pago con asesor",
    amountToPay: "Valor a pagar",
    back: "Volver al itinerario",
    checkoutDisabled:
      "El checkout online no esta habilitado para este itinerario. Tu asesor compartira las instrucciones de pago.",
    continueToStripe: "Continuar a checkout seguro",
    datePending: "Fecha pendiente",
    dueDate: "Vence",
    installment: "Cuota",
    paymentCopy:
      "Revisa la cuota seleccionada antes de abrir el checkout seguro de Stripe.",
    pendingBalance: "Saldo pendiente",
    securePayment: "Pago seguro",
    stripeReady: "Stripe listo",
    total: "Total",
  };
}
