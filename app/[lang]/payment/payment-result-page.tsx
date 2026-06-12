import { notFound } from "next/navigation";
import { EvoIcon } from "@/components/admin-next/evolucion/icons";
import {
  getPublicItineraryById,
  type PublicItinerarySupabaseClient,
  type PublicScheduledPayment,
} from "@/lib/admin-next/public-itinerary";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";

type PaymentResultKind = "success" | "cancel";

export async function PublicPaymentResultPage({
  kind,
  params,
  searchParams,
}: {
  kind: PaymentResultKind;
  params: Promise<{ lang: string }>;
  searchParams: Promise<{
    itinerary_id?: string;
    scheduled_payment_id?: string;
    session_id?: string;
  }>;
}) {
  const { lang } = await params;
  const {
    itinerary_id: itineraryId,
    scheduled_payment_id: scheduledPaymentId,
    session_id: sessionId,
  } = await searchParams;

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

  const label = copy(lang, kind);
  const retryUrl = buildPayUrl({
    itineraryId: publicItinerary.itinerary.id,
    lang,
    scheduledPaymentId: selectedPayment?.id,
  });
  const itineraryUrl = `/${lang}/view/${publicItinerary.itinerary.id}?hideEmptyDays=true`;

  return (
    <main
      className="pub"
      data-payment-result={kind}
      data-testid={`public-payment-${kind}-page`}
    >
      <div className="pub-bar">
        <a className="btn outline" href={itineraryUrl}>
          <EvoIcon name="back" size={16} />
          {label.back}
        </a>
        <span className="url">
          /{lang}/payment/{kind}
        </span>
      </div>
      <div className="pub-body">
        <div className="pub-doc">
          <section className="pub-hero">
            <div className="av s54">
              <EvoIcon name={kind === "success" ? "check2" : "x"} size={24} />
            </div>
            <div>
              <span
                className={kind === "success" ? "chip green" : "chip orange"}
              >
                {label.badge}
              </span>
              <h2>{label.title}</h2>
              <p>{label.body}</p>
            </div>
          </section>

          <section className="card" data-testid="public-payment-result-card">
            <div className="sum-row">
              <h3>{publicItinerary.itinerary.name}</h3>
              <span
                className={
                  selectedPayment?.status === "paid"
                    ? "chip green"
                    : "chip teal"
                }
                data-testid="public-payment-status"
              >
                {selectedPayment?.status === "paid"
                  ? label.paid
                  : label.pendingWebhook}
              </span>
            </div>
            <div className="bal-grid">
              <div className="bal-cell">
                <small>{label.installment}</small>
                <b data-testid="public-payment-result-installment">
                  {selectedPayment
                    ? `${label.installment} ${selectedPayment.paymentNumber}`
                    : label.pendingBalance}
                </b>
              </div>
              <div className="bal-cell">
                <small>{label.amount}</small>
                <b data-testid="public-payment-result-amount">
                  {formatCurrency(
                    selectedPayment?.amount ??
                      publicItinerary.paymentPlan.pendingAmount,
                    selectedPayment?.currency ??
                      publicItinerary.paymentPlan.currency,
                    lang,
                  )}
                </b>
              </div>
              <div className="bal-cell">
                <small>{label.reference}</small>
                <b data-testid="public-payment-session">
                  {sessionId || label.referencePending}
                </b>
              </div>
            </div>
            <div className="pub-cta">
              {kind === "cancel" ? (
                <a
                  className="btn primary"
                  data-testid="public-payment-retry"
                  href={retryUrl}
                >
                  <EvoIcon name="card" size={16} />
                  {label.retry}
                </a>
              ) : (
                <a
                  className="btn primary"
                  data-testid="public-payment-view-itinerary"
                  href={itineraryUrl}
                >
                  <EvoIcon name="file" size={16} />
                  {label.viewItinerary}
                </a>
              )}
            </div>
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
    return (
      payments.find((payment) => payment.id === scheduledPaymentId) ?? null
    );
  }

  return payments.find((payment) => payment.status !== "paid") ?? null;
}

function buildPayUrl({
  itineraryId,
  lang,
  scheduledPaymentId,
}: {
  itineraryId: string;
  lang: "es" | "en";
  scheduledPaymentId?: string;
}) {
  const query = new URLSearchParams({ itinerary_id: itineraryId });
  if (scheduledPaymentId) query.set("scheduled_payment_id", scheduledPaymentId);
  return `/${lang}/payment/pay?${query.toString()}`;
}

function formatCurrency(amount: number, currency: string, lang: "es" | "en") {
  return new Intl.NumberFormat(lang === "en" ? "en-US" : "es-CO", {
    currency,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
}

function copy(lang: "es" | "en", kind: PaymentResultKind) {
  if (lang === "en") {
    return {
      amount: "Amount",
      back: "Back to itinerary",
      badge: kind === "success" ? "Checkout completed" : "Checkout cancelled",
      body:
        kind === "success"
          ? "Stripe returned you to Bukeer. The payment will appear as paid once the webhook updates the shared backend."
          : "The checkout was cancelled before payment. You can retry the same installment without changing the itinerary.",
      installment: "Installment",
      paid: "Paid",
      pendingBalance: "Pending balance",
      pendingWebhook: "Webhook pending",
      reference: "Stripe session",
      referencePending: "Pending",
      retry: "Retry payment",
      title:
        kind === "success"
          ? "Payment submitted for confirmation"
          : "Payment was not completed",
      viewItinerary: "View itinerary",
    };
  }

  return {
    amount: "Valor",
    back: "Volver al itinerario",
    badge: kind === "success" ? "Checkout completado" : "Checkout cancelado",
    body:
      kind === "success"
        ? "Stripe te regreso a Bukeer. El pago aparecera como pagado cuando el webhook actualice el backend compartido."
        : "El checkout se cancelo antes del pago. Puedes reintentar la misma cuota sin cambiar el itinerario.",
    installment: "Cuota",
    paid: "Pagado",
    pendingBalance: "Saldo pendiente",
    pendingWebhook: "Webhook pendiente",
    reference: "Sesion Stripe",
    referencePending: "Pendiente",
    retry: "Reintentar pago",
    title:
      kind === "success"
        ? "Pago enviado a confirmacion"
        : "El pago no se completo",
    viewItinerary: "Ver itinerario",
  };
}
