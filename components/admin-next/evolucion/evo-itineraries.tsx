// Itinerarios Evolución — port exacto del prototipo (bukeer-screens-lists.js
// itinerariesList + itinerariesKanban). Vista lista/kanban en la URL (?view=kanban),
// filas con borde de acento por estado, métricas Total/Margen, kanban de 5 columnas.

import Link from "next/link";
import type {
  ItinerariesFixture,
  ItineraryStatus,
  ItinerarySummary,
} from "@/lib/admin-next/fixtures/itineraries";
import { EvoIcon } from "./icons";
import { EvoNewItineraryModal } from "./evo-new-itinerary-modal";
import { EvoDataState } from "./evo-data-state";

type ItineraryStatusFilter = ItineraryStatus | "all";

type ItineraryListFilters = {
  q: string;
  status: ItineraryStatusFilter;
};

type StatusSpec = {
  label: string;
  chipClass: string;
  withDot?: boolean;
  accent: string;
};

const STATUS: Record<ItineraryStatus, StatusSpec> = {
  draft: { label: "Borrador", chipClass: "chip", accent: "var(--text3)" },
  quoted: {
    label: "Presupuesto",
    chipClass: "chip purple",
    accent: "var(--primary)",
  },
  won: {
    label: "Confirmado",
    chipClass: "chip green",
    withDot: true,
    accent: "var(--green)",
  },
  operating: {
    label: "En operación",
    chipClass: "chip teal",
    accent: "var(--teal)",
  },
  closed: { label: "Finalizado", chipClass: "chip", accent: "var(--border)" },
};

const AVATAR_TONES = ["", "teal", "orange", "green"];
const STATUS_FILTERS: Array<{
  id: ItineraryStatusFilter;
  label: string;
  icon?: "file" | "edit" | "check";
}> = [
  { id: "all", label: "Todos" },
  { id: "draft", label: "Borrador", icon: "file" },
  { id: "quoted", label: "Presupuesto", icon: "edit" },
  { id: "won", label: "Confirmado", icon: "check" },
];

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function avatarToneFor(owner: string): string {
  let hash = 0;
  for (const char of owner)
    hash = (hash + char.charCodeAt(0)) % AVATAR_TONES.length;
  return AVATAR_TONES[hash];
}

function StatusChip({ status }: { status: ItineraryStatus }) {
  const spec = STATUS[status];
  return (
    <span className={spec.chipClass}>
      {spec.withDot ? <span className="dot" /> : null}
      {spec.label}
    </span>
  );
}

function ItineraryRow({ itinerary }: { itinerary: ItinerarySummary }) {
  const spec = STATUS[itinerary.status];
  return (
    <Link
      href={itinerary.href}
      className="card iti-row"
      style={{ ["--acc" as string]: spec.accent }}
      data-testid={`admin-next-itinerary-${itinerary.id}`}
    >
      <div className="iti-main">
        <div className="l1">
          <b>{itinerary.title}</b>
          <StatusChip status={itinerary.status} />
        </div>
        <div className="mchips">
          <span className="mchip">
            <EvoIcon name="tag" size={13} /> {itinerary.code}
          </span>
          <span className="mchip">
            <EvoIcon name="user" size={13} /> {itinerary.customer}
          </span>
          <span className="mchip">
            <EvoIcon name="cal" size={13} /> {itinerary.startDate} –{" "}
            {itinerary.endDate}
          </span>
          {itinerary.pax > 0 ? (
            <span className="mchip">
              <EvoIcon name="users" size={13} /> {itinerary.pax} viajeros
            </span>
          ) : null}
          <span className="mchip">
            <EvoIcon name="clock" size={13} /> {itinerary.nextService}
          </span>
        </div>
      </div>
      <div className="iti-fin">
        <div className="amt2">
          <div className="k">Total</div>
          <div className="v">{itinerary.value}</div>
        </div>
        <div className="amt2">
          <div className="k">Margen</div>
          <div className="v green">{itinerary.margin}</div>
        </div>
      </div>
      <div className={`av s32 ${avatarToneFor(itinerary.owner)}`}>
        {initialsOf(itinerary.owner)}
      </div>
      <span style={{ color: "var(--text3)" }}>
        <EvoIcon name="chevR" size={16} />
      </span>
    </Link>
  );
}

function KanbanCard({ itinerary }: { itinerary: ItinerarySummary }) {
  return (
    <Link
      href={itinerary.href}
      className="kb-card"
      data-testid={`admin-next-itinerary-kb-${itinerary.id}`}
    >
      <b>{itinerary.title}</b>
      <div className="kb-meta">
        <EvoIcon name="user" size={12} />
        <span>{itinerary.customer}</span>
      </div>
      <div className="kb-meta">
        <EvoIcon name="cal" size={12} />
        <span>
          {itinerary.startDate} – {itinerary.endDate}
        </span>
      </div>
      <div className="kb-fin">
        <b>{itinerary.value}</b>
        <span className="mg">{itinerary.margin}</span>
      </div>
      <div className="kb-foot">
        <div className={`av s24 ${avatarToneFor(itinerary.owner)}`}>
          {initialsOf(itinerary.owner)}
        </div>
        <span className="id">#{itinerary.code}</span>
      </div>
    </Link>
  );
}

function buildItinerariesHref({
  create,
  view,
  status,
  q,
}: {
  create?: boolean;
  view?: "list" | "kanban";
  status?: ItineraryStatusFilter;
  q?: string;
}): string {
  const params = new URLSearchParams();
  if (create) params.set("new", "itinerary");
  if (view === "kanban") params.set("view", "kanban");
  if (status && status !== "all") params.set("status", status);
  if (q) params.set("q", q);
  const query = params.toString();
  return query ? `/admin/itineraries?${query}` : "/admin/itineraries";
}

export function EvoItineraries({
  createDefaults,
  filters,
  fixture,
  showCreateModal,
  subtitle,
  view,
  writesEnabled,
}: {
  createDefaults: { startDate: string; endDate: string };
  filters: ItineraryListFilters;
  fixture: ItinerariesFixture;
  showCreateModal: boolean;
  subtitle: string;
  view: "list" | "kanban";
  writesEnabled: boolean;
}) {
  const closeCreateHref = buildItinerariesHref({
    view,
    status: filters.status,
    q: filters.q,
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Itinerarios</h1>
          <div className="sub">{subtitle}</div>
        </div>
        <div className="actions">
          <Link
            href={buildItinerariesHref({
              create: true,
              view,
              status: filters.status,
              q: filters.q,
            })}
            className="btn primary"
            data-testid="admin-next-itineraries-new"
          >
            <EvoIcon name="plus" size={15} /> Nuevo itinerario
          </Link>
        </div>
      </div>

      <div className="lfilters">
        <div
          className="vtoggle"
          data-testid="admin-next-itineraries-view-toggle"
        >
          <Link
            href={buildItinerariesHref({
              status: filters.status,
              q: filters.q,
            })}
            className={`seg${view === "list" ? " on" : ""}`}
            data-testid="admin-next-itineraries-view-list"
          >
            <EvoIcon name="list" size={14} /> Lista
          </Link>
          <Link
            href={buildItinerariesHref({
              view: "kanban",
              status: filters.status,
              q: filters.q,
            })}
            className={`seg${view === "kanban" ? " on" : ""}`}
            data-testid="admin-next-itineraries-view-kanban"
          >
            <EvoIcon name="kanban" size={14} /> Kanban
          </Link>
        </div>
        <span className="fchip">
          <EvoIcon name="user" size={13} /> Travel Planner: Todos{" "}
          <EvoIcon name="chevD" size={12} />
        </span>
        <span className="fchip">
          <EvoIcon name="clock" size={13} /> Fecha de creación{" "}
          <EvoIcon name="chevD" size={12} />
        </span>
        <form
          className="searchbox"
          action="/admin/itineraries"
          data-testid="admin-next-itineraries-search"
        >
          <EvoIcon name="search" size={15} />
          {view === "kanban" ? (
            <input type="hidden" name="view" value="kanban" />
          ) : null}
          {filters.status !== "all" ? (
            <input type="hidden" name="status" value={filters.status} />
          ) : null}
          <input
            aria-label="Buscar itinerarios"
            data-testid="admin-next-itineraries-search-input"
            name="q"
            placeholder="Buscar por cliente, ID o nombre…"
            defaultValue={filters.q}
          />
        </form>
      </div>

      {view === "list" ? (
        <>
          <div className="filterbar">
            {STATUS_FILTERS.map((filter) => (
              <Link
                key={filter.id}
                href={buildItinerariesHref({
                  status: filter.id,
                  q: filters.q,
                })}
                className={`fchip${filters.status === filter.id ? " on" : ""}`}
                data-testid={`admin-next-itineraries-status-${filter.id}`}
              >
                {filter.icon ? <EvoIcon name={filter.icon} size={13} /> : null}
                {filter.label}
              </Link>
            ))}
            <span className="sortnote">
              <EvoIcon name="download" size={12} /> Ordenado por fecha de
              creación · más recientes primero
            </span>
          </div>
          <div className="iti-list" data-testid="admin-next-itineraries-list">
            {fixture.itineraries.length > 0 ? (
              fixture.itineraries.map((itinerary) => (
                <ItineraryRow key={itinerary.id} itinerary={itinerary} />
              ))
            ) : (
              <EvoDataState
                kind="empty"
                title="Sin itinerarios"
                description="No hay resultados para los filtros actuales."
                actionHref="/admin/itineraries"
                actionLabel="Limpiar filtros"
                testId="admin-next-itineraries-empty"
              />
            )}
          </div>
        </>
      ) : (
        <div className="kb" data-testid="admin-next-itineraries-kanban">
          {fixture.statuses.map((column) => {
            const cards = fixture.itineraries.filter(
              (itinerary) => itinerary.status === column.id,
            );
            return (
              <div
                key={column.id}
                className="kb-col"
                data-testid={`admin-next-kb-col-${column.id}`}
              >
                <div className="kb-head">
                  <span
                    className="dot"
                    style={{ background: STATUS[column.id].accent }}
                  />
                  {column.label}
                  <span className="count">{cards.length}</span>
                </div>
                {cards.map((itinerary) => (
                  <KanbanCard key={itinerary.id} itinerary={itinerary} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal ? (
        <EvoNewItineraryModal
          closeHref={closeCreateHref}
          defaultEndDate={createDefaults.endDate}
          defaultStartDate={createDefaults.startDate}
          writesEnabled={writesEnabled}
        />
      ) : null}
    </>
  );
}
