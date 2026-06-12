import type { ReactNode } from "react";
import { EvoAgenda } from "@/components/admin-next/evolucion/evo-agenda";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import {
  createAgendaAdapter,
  type AdminNextAgendaReadonlySupabaseClient,
} from "@/lib/admin-next/agenda-adapter";
import { buildAdminNextReadErrorState } from "@/lib/admin-next/evolucion-state";
import { getAdminNextDataSourceMode } from "@/lib/admin-next/flags";
import { requireAdminNextSession } from "@/lib/admin-next/route-boundary";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agenda | Bukeer Admin Next",
};

export default async function AdminNextAgendaPage() {
  const session = await requireAdminNextSession({ nextPath: "/admin/agenda" });
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
        ? createAgendaAdapter({
            mode: "readonly",
            supabase:
              (await createSupabaseServerClient()) as unknown as AdminNextAgendaReadonlySupabaseClient,
            accountId: session.accountId,
          })
        : createAgendaAdapter(dataSourceMode);
    const fixture = await adapter.getAgenda();
    content = <EvoAgenda fixture={fixture} />;
  } catch (error) {
    const state = buildAdminNextReadErrorState({ area: "agenda", error });
    content = (
      <EvoDataState
        {...state}
        actionHref="/admin/agenda"
        actionLabel="Reintentar"
        testId="admin-next-agenda-error"
      />
    );
  }

  return (
    <EvoShell
      userName={session.displayName}
      accountLabel={session.email}
      role={session.role}
      activeKey="agenda"
    >
      {content}
    </EvoShell>
  );
}
