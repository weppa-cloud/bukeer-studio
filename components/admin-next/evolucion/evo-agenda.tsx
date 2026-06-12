import Link from "next/link";
import type {
  AgendaDay,
  AgendaFixture,
  AgendaService,
  AgendaSignal,
} from "@/lib/admin-next/fixtures/agenda";
import { EvoDataState } from "./evo-data-state";
import { EvoIcon, type EvoIconName } from "./icons";

const SERVICE_ICONS: Record<AgendaService["type"], EvoIconName> = {
  flight: "plane",
  hotel: "bed",
  transport: "car",
  activity: "ticket",
};

const SERVICE_LABELS: Record<AgendaService["type"], string> = {
  flight: "Vuelo",
  hotel: "Hotel",
  transport: "Transporte",
  activity: "Actividad",
};

export function EvoAgenda({ fixture }: { fixture: AgendaFixture }) {
  const servicesCount = fixture.days.reduce(
    (count, day) => count + day.services.length,
    0,
  );
  const hasVisibleDays = fixture.days.length > 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Agenda</h1>
          <div className="sub">
            Servicios programados · {fixture.rangeLabel} · {servicesCount}{" "}
            servicios
          </div>
        </div>
        <div className="actions">
          <span
            className="btn outline"
            data-testid="admin-next-agenda-date-range"
          >
            <EvoIcon name="cal" size={15} /> {fixture.rangeLabel}
          </span>
          <span className="btn primary" data-testid="admin-next-agenda-new">
            <EvoIcon name="plus" size={15} /> Nuevo servicio
          </span>
        </div>
      </div>

      <div className="filterbar" data-testid="admin-next-agenda-toolbar">
        <span className="fchip on">Todos</span>
        <span className="fchip">
          <EvoIcon name="plane" size={12} /> Vuelos
        </span>
        <span className="fchip">
          <EvoIcon name="bed" size={12} /> Hoteles
        </span>
        <span className="fchip">
          <EvoIcon name="car" size={12} /> Transporte
        </span>
        <span className="fchip">
          <EvoIcon name="ticket" size={12} /> Servicios
        </span>
      </div>

      <div className="iti-grid">
        <section
          className="iti-col ag-list"
          data-testid="admin-next-agenda-list"
        >
          {hasVisibleDays ? (
            fixture.days.map((day) => <AgendaDayGroup day={day} key={day.id} />)
          ) : (
            <EvoDataState
              kind="empty"
              title="Sin servicios programados"
              description="No hay agenda visible para el rango seleccionado. Ajusta fechas o crea el primer servicio."
              testId="admin-next-agenda-empty"
            />
          )}
        </section>

        <section className="card" data-testid="admin-next-agenda-signals">
          <div className="card-head">
            <h3>Riesgos de operación</h3>
          </div>
          {fixture.signals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} />
          ))}
        </section>
      </div>
    </>
  );
}

function AgendaDayGroup({ day }: { day: AgendaDay }) {
  return (
    <section
      className="card ag-group"
      data-testid={`admin-next-agenda-day-${day.id}`}
    >
      <div className="ag-head">
        <div className="ag-date">
          <b>{day.day}</b>
          <span>{day.month}</span>
        </div>
        <div className="t">
          <b>{day.title}</b>
          <span>{day.meta}</span>
        </div>
        <span className="chev">
          <EvoIcon name="chevD" size={15} />
        </span>
      </div>
      {day.services.length > 0 ? (
        day.services.map((service) => (
          <AgendaServiceRow key={service.id} service={service} />
        ))
      ) : (
        <div
          className="empty-card"
          data-testid={`admin-next-agenda-day-${day.id}-empty`}
        >
          Sin servicios visibles para este día.
        </div>
      )}
    </section>
  );
}

function AgendaServiceRow({ service }: { service: AgendaService }) {
  return (
    <article
      className="ag-item"
      data-testid={`admin-next-agenda-service-${service.id}`}
    >
      <div className="svc-ico">
        <EvoIcon name={SERVICE_ICONS[service.type]} size={15} />
      </div>
      <div className="ag-main">
        <b>{service.title}</b>
        <span>
          {SERVICE_LABELS[service.type]} · {service.supplier} ·{" "}
          {service.customer}
        </span>
      </div>
      <Link
        className="iti-link"
        data-testid={`admin-next-agenda-itinerary-${service.id}`}
        href={`/admin/itineraries/${service.itineraryId}`}
      >
        ID {shortId(service.itineraryId)}
      </Link>
      <div className="ag-badges">
        <StatusBadge value={service.customerPayment} />
        <StatusBadge value={service.supplierPayment} />
        <StatusBadge value={service.notification} />
      </div>
      <div className="amt2">
        <div className="v">{service.amount}</div>
        <div className="k">Total</div>
      </div>
    </article>
  );
}

function shortId(value: string): string {
  return value.length > 8 ? value.slice(0, 8) : value;
}

function StatusBadge({ value }: { value: string }) {
  const className =
    value.includes("pagado") || value.includes("Notificado")
      ? "chip green"
      : value.includes("pendiente") || value.includes("Sin notificar")
        ? "chip orange"
        : "chip purple";

  return <span className={className}>{value}</span>;
}

function SignalRow({ signal }: { signal: AgendaSignal }) {
  const className =
    signal.tone === "warning"
      ? "chip orange"
      : signal.tone === "live"
        ? "chip teal"
        : signal.tone === "success"
          ? "chip green"
          : "chip purple";

  return (
    <div className="trow" data-testid={`admin-next-agenda-signal-${signal.id}`}>
      <div className="svc-ico">
        <EvoIcon name="spark" size={15} />
      </div>
      <div className="grow">
        <b>{signal.label}</b>
        <span>{signal.detail}</span>
      </div>
      <span className={className}>{signal.tone}</span>
    </div>
  );
}
