import type { ReactNode } from "react";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { EvoItineraries } from "@/components/admin-next/evolucion/evo-itineraries";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { buildAdminNextReadErrorState } from "@/lib/admin-next/evolucion-state";
import { getAdminNextDataSourceMode } from "@/lib/admin-next/flags";
import {
  createItinerariesAdapter,
  type AdminNextItinerariesReadonlySupabaseClient,
} from "@/lib/admin-next/itineraries-adapter";
import { requireAdminNextSession } from "@/lib/admin-next/route-boundary";
import type {
  ItinerariesFixture,
  ItineraryStatus,
  ItinerarySummary,
} from "@/lib/admin-next/fixtures/itineraries";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Itinerarios | Bukeer Admin Next",
};

const STATUS_FILTERS = new Set<ItineraryStatus>([
  "draft",
  "quoted",
  "won",
  "operating",
  "closed",
]);

export default async function AdminNextItinerariesPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    status?: string;
    q?: string;
    new?: string;
  }>;
}) {
  const session = await requireAdminNextSession({
    nextPath: "/admin/itineraries",
    permission: "planner.view",
  });
  const { view, status, q, new: createMode } = await searchParams;
  const activeStatus = STATUS_FILTERS.has(status as ItineraryStatus)
    ? (status as ItineraryStatus)
    : "all";
  const query = normalizeQuery(q);

  const requestedDataSourceMode = getAdminNextDataSourceMode();
  const dataSourceMode =
    requestedDataSourceMode === "readonly" &&
    session.flags.adminNextBetaReadonly
      ? "readonly"
      : "fixture";
  let content: ReactNode;

  try {
    const adapter =
      dataSourceMode === "readonly"
        ? createItinerariesAdapter({
            mode: "readonly",
            supabase:
              (await createSupabaseServerClient()) as unknown as AdminNextItinerariesReadonlySupabaseClient,
            accountId: session.accountId,
          })
        : createItinerariesAdapter(dataSourceMode);
    const sourceFixture = await adapter.getItineraries();
    const fixture = filterItinerariesFixture(sourceFixture, {
      q: query,
      status: activeStatus,
    });

    const active = fixture.itineraries.filter(
      (itinerary) => itinerary.status !== "closed",
    ).length;
    const quoted = fixture.itineraries.filter(
      (itinerary) => itinerary.status === "quoted",
    ).length;
    const subtitle = `${active} activos · ${quoted} por confirmar`;
    content = (
      <EvoItineraries
        fixture={fixture}
        subtitle={subtitle}
        filters={{ q: query, status: activeStatus }}
        view={view === "kanban" ? "kanban" : "list"}
        showCreateModal={createMode === "itinerary"}
        writesEnabled={session.flags.adminNextItineraryWrites}
        createDefaults={getDefaultCreateDates()}
      />
    );
  } catch (error) {
    const state = buildAdminNextReadErrorState({
      area: "itinerarios",
      error,
    });
    content = (
      <EvoDataState
        {...state}
        actionHref="/admin/itineraries"
        actionLabel="Reintentar"
        testId="admin-next-itineraries-error"
      />
    );
  }

  return (
    <EvoShell
      userName={session.displayName}
      accountLabel={session.email}
      role={session.role}
      activeKey="itis"
    >
      {content}
    </EvoShell>
  );
}

function normalizeQuery(value: string | undefined): string {
  return value?.trim().slice(0, 80) ?? "";
}

function filterItinerariesFixture(
  fixture: ItinerariesFixture,
  filters: { q: string; status: ItineraryStatus | "all" },
): ItinerariesFixture {
  const normalizedQuery = filters.q.toLocaleLowerCase("es-CO");
  const itineraries = fixture.itineraries.filter((itinerary) => {
    if (filters.status !== "all" && itinerary.status !== filters.status) {
      return false;
    }
    if (!normalizedQuery) return true;
    return searchableText(itinerary).includes(normalizedQuery);
  });

  return {
    ...fixture,
    itineraries,
  };
}

function searchableText(itinerary: ItinerarySummary): string {
  return [
    itinerary.title,
    itinerary.customer,
    itinerary.code,
    itinerary.destination,
    itinerary.owner,
  ]
    .join(" ")
    .toLocaleLowerCase("es-CO");
}

function getDefaultCreateDates(): { startDate: string; endDate: string } {
  const start = new Date();
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 5);

  return {
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
  };
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}
