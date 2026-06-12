import type { ReactNode } from "react";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import {
  EvoItineraryDetail,
  type ItineraryPdfResult,
} from "@/components/admin-next/evolucion/evo-itinerary-detail";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { buildAdminNextReadErrorState } from "@/lib/admin-next/evolucion-state";
import { getAdminNextDataSourceMode } from "@/lib/admin-next/flags";
import { canCorrectItineraryConfirmationDateRole } from "@/lib/admin-next/itinerary-permissions";
import {
  createItinerariesAdapter,
  type AdminNextItinerariesReadonlySupabaseClient,
} from "@/lib/admin-next/itineraries-adapter";
import { requireAdminNextSession } from "@/lib/admin-next/route-boundary";
import type { ItineraryDetailTab } from "@/lib/admin-next/fixtures/itineraries";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Detalle de itinerario | Bukeer Admin Next",
};

const VALID_TABS: ItineraryDetailTab[] = [
  "services",
  "passengers",
  "payments",
  "suppliers",
  "preview",
];

export default async function AdminNextItineraryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    edit?: string;
    pdfError?: string;
    pdfKind?: string;
    pdfUrl?: string;
    tab?: string;
  }>;
}) {
  const { id } = await params;
  const { edit, pdfError, pdfKind, pdfUrl, tab } = await searchParams;
  const session = await requireAdminNextSession({
    nextPath: `/admin/itineraries/${id}`,
    permission: "planner.view",
  });

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
    const data = await adapter.getItineraryDetail(id);

    if (data) {
      const activeTab = VALID_TABS.includes(tab as ItineraryDetailTab)
        ? (tab as ItineraryDetailTab)
        : "services";
      const pdfResult = buildPdfResult({ pdfError, pdfKind, pdfUrl });
      content = (
        <EvoItineraryDetail
          data={data}
          activeTab={activeTab}
          canCorrectConfirmationDate={canCorrectItineraryConfirmationDateRole(
            session.role,
          )}
          pdfResult={pdfResult}
          showEditModal={edit === "header"}
          writesEnabled={session.flags.adminNextItineraryWrites}
        />
      );
    } else {
      content = (
        <EvoDataState
          kind="empty"
          title="Itinerario no encontrado"
          description="Este itinerario no existe para la cuenta actual o ya no esta disponible en el backend compartido."
          actionHref="/admin/itineraries"
          actionLabel="Volver a itinerarios"
          testId="admin-next-itinerary-detail-empty"
        />
      );
    }
  } catch (error) {
    const state = buildAdminNextReadErrorState({
      area: "el detalle de itinerario",
      error,
    });
    content = (
      <EvoDataState
        {...state}
        actionHref={`/admin/itineraries/${id}`}
        actionLabel="Reintentar"
        testId="admin-next-itinerary-detail-error"
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

function buildPdfResult({
  pdfError,
  pdfKind,
  pdfUrl,
}: {
  pdfError?: string;
  pdfKind?: string;
  pdfUrl?: string;
}): ItineraryPdfResult | undefined {
  const kind =
    pdfKind === "account_statement" || pdfKind === "proposal"
      ? pdfKind
      : undefined;
  if (pdfUrl) return { kind, url: pdfUrl };
  if (pdfError) return { error: pdfError, kind };
  return undefined;
}
