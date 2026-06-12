import { notFound } from "next/navigation";
import { EvoIcon, type EvoIconName } from "@/components/admin-next/evolucion/icons";
import {
  getPublicItineraryById,
  type PublicItinerary,
  type PublicItineraryItem,
  type PublicItinerarySupabaseClient,
} from "@/lib/admin-next/public-itinerary";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { addPublicPassengerAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Itinerario publico | Bukeer",
};

export default async function PublicItineraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ itineraryId: string; lang: string }>;
  searchParams: Promise<{
    guestError?: string;
    guestPassenger?: string;
    hideEmptyDays?: string;
  }>;
}) {
  const { itineraryId, lang } = await params;
  const { guestError, guestPassenger } = await searchParams;

  if (lang !== "es" && lang !== "en") notFound();

  const publicItinerary = await getPublicItineraryById({
    itineraryId,
    supabase:
      createSupabaseServiceRoleClient() as unknown as PublicItinerarySupabaseClient,
  });

  if (!publicItinerary) notFound();

  return (
    <main className="pub" data-testid="public-itinerary-view">
      <div className="pub-bar">
        <span className="chip purple">
          <EvoIcon name="share" size={14} />
          {copy(lang).publicLink}
        </span>
        <span className="url" data-testid="public-itinerary-url">
          /{lang}/view/{publicItinerary.itinerary.id}?hideEmptyDays=true
        </span>
      </div>
      <div className="pub-body">
        <div className="pub-doc">
          <PublicHero data={publicItinerary} lang={lang} />
          <div className="pub-tabs" aria-label={copy(lang).sections}>
            <a className="pt on" href="#preview" data-testid="public-tab-preview">
              <EvoIcon name="route" size={14} />
              {copy(lang).preview}
            </a>
            <a className="pt" href="#passengers" data-testid="public-tab-passengers">
              <EvoIcon name="users" size={14} />
              {copy(lang).passengers}
            </a>
            <a className="pt" href="#confirmation" data-testid="public-tab-confirmation">
              <EvoIcon name="card" size={14} />
              {copy(lang).confirmation}
            </a>
          </div>
          <ServicesSection data={publicItinerary} lang={lang} />
          <PassengerSection
            data={publicItinerary}
            guestError={guestError}
            guestPassenger={guestPassenger}
            lang={lang}
          />
          <PaymentPlanSection data={publicItinerary} lang={lang} />
          <ConfirmationSection data={publicItinerary} lang={lang} />
          <footer className="pub-foot">
            <span>{copy(lang).footerTerms}</span>
            <span>{copy(lang).footerAdvisor}</span>
          </footer>
        </div>
      </div>
    </main>
  );
}

function PublicHero({
  data,
  lang,
}: {
  data: PublicItinerary;
  lang: "es" | "en";
}) {
  const itinerary = data.itinerary;
  const travelDates = formatDateRange(itinerary.startDate, itinerary.endDate, lang);
  const passengerLabel =
    lang === "en"
      ? `${itinerary.passengerCount} traveler${itinerary.passengerCount === 1 ? "" : "s"}`
      : `${itinerary.passengerCount} pasajero${itinerary.passengerCount === 1 ? "" : "s"}`;

  return (
    <>
      <section className="pub-hero" data-testid="public-itinerary-summary">
        <div className="av s54">
          <EvoIcon name="route" size={24} />
        </div>
        <div>
          <span className="chip teal">{copy(lang).proposal}</span>
          <h2>{itinerary.name}</h2>
          <p>{itinerary.personalizedMessage || copy(lang).defaultMessage}</p>
          <div className="pub-cta">
            <span className="chip purple">
              <EvoIcon name="cal" size={14} />
              {travelDates}
            </span>
            <span className="chip orange">
              <EvoIcon name="users" size={14} />
              {passengerLabel}
            </span>
          </div>
        </div>
      </section>
      <section className="pub-hero2" id="preview">
        <div>
          <span className="countdown">{copy(lang).visibleProposal}</span>
          <span className="chip teal">{itinerary.clientName}</span>
          <h2>{itinerary.name}</h2>
          <div className="meta">
            {travelDates} · {data.items.length} {copy(lang).services}
          </div>
        </div>
        {itinerary.ratesVisible ? (
          <div className="pv2-price" data-testid="public-itinerary-total">
            <div className="k">{copy(lang).total}</div>
            <div className="v">{formatCurrency(itinerary.totalAmount, itinerary.currency, lang)}</div>
            <div className="s">{itinerary.currency}</div>
          </div>
        ) : null}
      </section>
    </>
  );
}

function ServicesSection({
  data,
  lang,
}: {
  data: PublicItinerary;
  lang: "es" | "en";
}) {
  const groups = groupItemsByDay(data.items);

  return (
    <section className="card" aria-labelledby="public-services-title">
      <h3 id="public-services-title">{copy(lang).includedServices}</h3>
      {groups.length === 0 ? (
        <div className="empty-card" data-testid="public-services-empty">
          {copy(lang).emptyServices}
        </div>
      ) : (
        groups.map((group) => (
          <div className="pv-day" key={group.dayNumber}>
            <div className="sum-row">
              <b>
                {copy(lang).day} {group.dayNumber}
              </b>
              <span>{formatDate(group.date, lang)}</span>
            </div>
            {group.items.map((item) => (
              <div
                className="pv-item"
                data-testid={`public-itinerary-item-${item.id}`}
                key={item.id}
              >
                <div className="svc-ico">
                  <EvoIcon name={iconForType(item.productType)} size={17} />
                </div>
                <div>
                  <b>{item.label}</b>
                  <p>
                    {item.productType} · {item.destination} · {item.quantity}x
                  </p>
                </div>
              </div>
            ))}
          </div>
        ))
      )}
    </section>
  );
}

function PassengerSection({
  data,
  guestError,
  guestPassenger,
  lang,
}: {
  data: PublicItinerary;
  guestError?: string;
  guestPassenger?: string;
  lang: "es" | "en";
}) {
  const remainingSlots = data.itinerary.passengerCount - data.passengers.length;
  const canAddPassenger = remainingSlots > 0;

  return (
    <section className="card" id="passengers" aria-labelledby="public-passengers-title">
      <div className="sum-row">
        <h3 id="public-passengers-title">{copy(lang).passengerRegistration}</h3>
        <span className="chip purple" data-testid="public-passenger-count">
          {data.passengers.length}/{data.itinerary.passengerCount}
        </span>
      </div>
      {guestPassenger === "created" ? (
        <div className="chip green" data-testid="public-passenger-success">
          <EvoIcon name="check" size={14} />
          {copy(lang).passengerCreated}
        </div>
      ) : null}
      {guestError ? (
        <div className="chip red" data-testid="public-passenger-error">
          {decodeURIComponent(guestError)}
        </div>
      ) : null}
      <div className="pv2-hl">
        {data.passengers.map((passenger) => (
          <span
            className={passenger.isMainPassenger ? "chip teal" : "chip purple"}
            data-testid={`public-passenger-${passenger.id}`}
            key={passenger.id}
          >
            <EvoIcon name="user" size={14} />
            {passenger.fullName}
          </span>
        ))}
        {data.passengers.length === 0 ? (
          <span className="chip orange">{copy(lang).noPassengers}</span>
        ) : null}
      </div>
      {canAddPassenger ? (
        <form action={addPublicPassengerAction} className="fsec" data-testid="public-passenger-form">
          <input name="itineraryId" type="hidden" value={data.itinerary.id} />
          <input name="lang" type="hidden" value={lang} />
          <div className="fgrid2">
            <label className="fgroup">
              <span className="flabel">{copy(lang).firstName}</span>
              <input className="finput" data-testid="public-passenger-first-name" name="firstName" required />
            </label>
            <label className="fgroup">
              <span className="flabel">{copy(lang).lastName}</span>
              <input className="finput" data-testid="public-passenger-last-name" name="lastName" required />
            </label>
            <label className="fgroup">
              <span className="flabel">{copy(lang).documentType}</span>
              <select className="finput" data-testid="public-passenger-document-type" name="documentType" required>
                <option value="Cedula de ciudadania">Cedula de ciudadania</option>
                <option value="Pasaporte">Pasaporte</option>
                <option value="Cedula de extranjeria">Cedula de extranjeria</option>
              </select>
            </label>
            <label className="fgroup">
              <span className="flabel">{copy(lang).documentNumber}</span>
              <input className="finput" data-testid="public-passenger-document-number" name="documentNumber" required />
            </label>
            <label className="fgroup">
              <span className="flabel">{copy(lang).nationality}</span>
              <input className="finput" data-testid="public-passenger-nationality" name="nationality" required />
            </label>
            <label className="fgroup">
              <span className="flabel">{copy(lang).birthDate}</span>
              <input className="finput" data-testid="public-passenger-birth-date" name="birthDate" type="date" />
            </label>
            <label className="fgroup">
              <span className="flabel">{copy(lang).email}</span>
              <input className="finput" data-testid="public-passenger-email" name="email" type="email" />
            </label>
            <label className="fgroup">
              <span className="flabel">{copy(lang).phone}</span>
              <input className="finput" data-testid="public-passenger-phone" name="phoneNumber" />
            </label>
          </div>
          <input name="gender" type="hidden" value="" />
          <label className="sum-row">
            <input
              data-testid="public-passenger-terms"
              name="acceptedTerms"
              required
              type="checkbox"
            />
            <span>{copy(lang).termsAcknowledgement}</span>
          </label>
          <button className="btn primary" data-testid="public-passenger-submit" type="submit">
            <EvoIcon name="plus" size={16} />
            {copy(lang).addPassenger}
          </button>
        </form>
      ) : (
        <div className="empty-card" data-testid="public-passenger-limit">
          {copy(lang).passengerLimit}
        </div>
      )}
    </section>
  );
}

function PaymentPlanSection({
  data,
  lang,
}: {
  data: PublicItinerary;
  lang: "es" | "en";
}) {
  const plan = data.paymentPlan;
  const paidPayments = plan.payments.filter((payment) => payment.status === "paid");

  return (
    <section className="card" id="payments" aria-labelledby="public-payments-title">
      <div className="sum-row">
        <h3 id="public-payments-title">{copy(lang).paymentPlan}</h3>
        <span className={plan.onlinePaymentEnabled ? "chip green" : "chip orange"}>
          {plan.onlinePaymentEnabled ? copy(lang).onlinePayment : copy(lang).advisorPayment}
        </span>
      </div>
      <div className="bal-grid" data-testid="public-payment-summary">
        <div className="bal-cell">
          <small>{copy(lang).installments}</small>
          <b>
            {paidPayments.length}/{plan.payments.length}
          </b>
        </div>
        <div className="bal-cell">
          <small>{copy(lang).pendingBalance}</small>
          <b>{formatCurrency(plan.pendingAmount, plan.currency, lang)}</b>
        </div>
        <div className="bal-cell">
          <small>{copy(lang).total}</small>
          <b>{formatCurrency(plan.totalAmount, plan.currency, lang)}</b>
        </div>
      </div>
      {plan.payments.length > 0 ? (
        <div className="fsec">
          {plan.payments.map((payment) => {
            const paid = payment.status === "paid";

            return (
              <div
                className="cuota"
                data-testid={`public-payment-installment-${payment.id}`}
                key={payment.id}
              >
                <div className="sum-row">
                  <div>
                    <b>
                      {copy(lang).installment} {payment.paymentNumber}
                    </b>
                    <p>
                      {copy(lang).dueDate}: {formatDate(payment.dueDate, lang)}
                    </p>
                  </div>
                  <span className={paid ? "chip green" : "chip orange"}>
                    {paid ? copy(lang).paid : copy(lang).pending}
                  </span>
                </div>
                <div className="pv2-foot">
                  <b>{formatCurrency(payment.amount, payment.currency, lang)}</b>
                  {!paid && plan.onlinePaymentEnabled ? (
                    <a
                      className="btn outline"
                      data-testid={`public-payment-link-${payment.id}`}
                      href={payment.paymentLink}
                    >
                      <EvoIcon name="card" size={16} />
                      {copy(lang).paySecurely}
                    </a>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-card" data-testid="public-payments-empty">
          {copy(lang).noPaymentPlan}
        </div>
      )}
    </section>
  );
}

function ConfirmationSection({
  data,
  lang,
}: {
  data: PublicItinerary;
  lang: "es" | "en";
}) {
  const ready = data.passengers.length >= data.itinerary.passengerCount;

  return (
    <section className="card" id="confirmation" aria-labelledby="public-confirmation-title">
      <div className="sum-row">
        <h3 id="public-confirmation-title">{copy(lang).paymentConfirmation}</h3>
        <span className={ready ? "chip green" : "chip orange"}>
          {ready ? copy(lang).ready : copy(lang).pendingPassengers}
        </span>
      </div>
      <p>{copy(lang).confirmationCopy}</p>
      <div className="pv2-foot">
        <span>
          <EvoIcon name="file" size={14} />
          {copy(lang).pdfAvailable}
        </span>
        <span>
          <EvoIcon name="card" size={14} />
          {copy(lang).paymentInstructions}
        </span>
      </div>
    </section>
  );
}

function groupItemsByDay(items: PublicItineraryItem[]) {
  const groups = new Map<number, { date: string | null; dayNumber: number; items: PublicItineraryItem[] }>();

  for (const item of items) {
    const dayNumber = item.dayNumber;
    const group = groups.get(dayNumber) ?? {
      date: item.date,
      dayNumber,
      items: [],
    };
    group.date ||= item.date;
    group.items.push(item);
    groups.set(dayNumber, group);
  }

  return Array.from(groups.values()).sort((a, b) => a.dayNumber - b.dayNumber);
}

function iconForType(productType: string): EvoIconName {
  const normalized = productType.toLowerCase();
  if (normalized.includes("hotel")) return "bed";
  if (normalized.includes("flight") || normalized.includes("vuelo")) return "plane";
  if (normalized.includes("transfer") || normalized.includes("traslado")) return "car";
  if (normalized.includes("activity") || normalized.includes("actividad")) return "ticket";
  return "route";
}

function formatDateRange(startDate: string | null, endDate: string | null, lang: "es" | "en") {
  const start = formatDate(startDate, lang);
  const end = formatDate(endDate, lang);
  if (start === copy(lang).datePending && end === copy(lang).datePending) {
    return copy(lang).datePending;
  }
  return `${start} - ${end}`;
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
      addPassenger: "Add passenger",
      birthDate: "Birth date",
      confirmation: "Confirmation",
      confirmationCopy:
        "Your advisor will validate passenger details and share the final payment instructions before confirming the trip.",
      datePending: "Dates pending",
      day: "Day",
      defaultMessage: "Review your proposal and complete passenger details to keep the booking moving.",
      documentNumber: "Document number",
      documentType: "Document type",
      email: "Email",
      emptyServices: "Services are being organized by your advisor.",
      firstName: "First name",
      footerAdvisor: "Your travel advisor remains available for itinerary changes.",
      footerTerms: "Public itinerary access follows Bukeer privacy and booking terms.",
      includedServices: "Included services",
      lastName: "Last name",
      nationality: "Nationality",
      noPassengers: "No passengers registered yet",
      passengerCreated: "Passenger registered",
      passengerLimit: "All expected passengers have been registered.",
      passengerRegistration: "Passenger registration",
      passengers: "Passengers",
      paymentConfirmation: "Payment and confirmation",
      paymentInstructions: "Payment instructions coordinated by advisor",
      advisorPayment: "Advisor payment",
      pdfAvailable: "Proposal PDF available from admin preview",
      pendingPassengers: "Pending passengers",
      dueDate: "Due date",
      phone: "Phone",
      installment: "Installment",
      installments: "Installments",
      noPaymentPlan: "No installment plan is configured yet. Your advisor will share payment instructions.",
      onlinePayment: "Online payment",
      paid: "Paid",
      paySecurely: "Pay securely",
      paymentPlan: "Payment plan",
      pending: "Pending",
      pendingBalance: "Pending balance",
      preview: "Preview",
      proposal: "Travel proposal",
      publicLink: "Public link",
      ready: "Ready for advisor review",
      sections: "Public itinerary sections",
      services: "services",
      termsAcknowledgement: "I acknowledge the booking and privacy terms for this passenger data.",
      total: "Total",
      visibleProposal: "Visible proposal",
    };
  }

  return {
    addPassenger: "Agregar pasajero",
    birthDate: "Fecha de nacimiento",
    confirmation: "Confirmacion",
    confirmationCopy:
      "Tu asesor validara los datos de pasajeros y compartira las instrucciones finales de pago antes de confirmar el viaje.",
    datePending: "Fechas por confirmar",
    day: "Dia",
    defaultMessage: "Revisa tu propuesta y completa los pasajeros para avanzar la reserva.",
    documentNumber: "Numero de documento",
    documentType: "Tipo de documento",
    email: "Email",
    emptyServices: "Tu asesor esta organizando los servicios.",
    firstName: "Nombre",
    footerAdvisor: "Tu asesor de viajes sigue disponible para ajustes del itinerario.",
    footerTerms: "El acceso publico del itinerario sigue los terminos de privacidad y reserva de Bukeer.",
    includedServices: "Servicios incluidos",
    lastName: "Apellido",
    nationality: "Nacionalidad",
    noPassengers: "Aun no hay pasajeros registrados",
    passengerCreated: "Pasajero registrado",
    passengerLimit: "Ya se registraron todos los pasajeros esperados.",
    passengerRegistration: "Registro de pasajeros",
    passengers: "Pasajeros",
    paymentConfirmation: "Pago y confirmacion",
    paymentInstructions: "Instrucciones de pago coordinadas por el asesor",
    advisorPayment: "Pago con asesor",
    pdfAvailable: "PDF de propuesta disponible desde preview admin",
    pendingPassengers: "Faltan pasajeros",
    dueDate: "Vence",
    phone: "Telefono",
    installment: "Cuota",
    installments: "Cuotas",
    noPaymentPlan: "Aun no hay plan de cuotas configurado. Tu asesor compartira las instrucciones de pago.",
    onlinePayment: "Pago online",
    paid: "Pagada",
    paySecurely: "Pagar seguro",
    paymentPlan: "Plan de pagos",
    pending: "Pendiente",
    pendingBalance: "Saldo pendiente",
    preview: "Preview",
    proposal: "Propuesta de viaje",
    publicLink: "Link publico",
    ready: "Listo para revision del asesor",
    sections: "Secciones del itinerario publico",
    services: "servicios",
    termsAcknowledgement: "Acepto los terminos de reserva y privacidad para estos datos de pasajero.",
    total: "Total",
    visibleProposal: "Propuesta visible",
  };
}
