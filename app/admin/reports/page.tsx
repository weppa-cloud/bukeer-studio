import type { ReactNode } from "react";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoReports } from "@/components/admin-next/evolucion/evo-reports";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { buildAdminNextReadErrorState } from "@/lib/admin-next/evolucion-state";
import { getAdminNextDataSourceMode } from "@/lib/admin-next/flags";
import {
  createReportsAdapter,
  type AdminNextReportsReadonlySupabaseClient,
} from "@/lib/admin-next/reports-adapter";
import { requireAdminNextSession } from "@/lib/admin-next/route-boundary";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reportes | Bukeer Admin Next",
};

export default async function AdminNextReportsPage() {
  const session = await requireAdminNextSession({ nextPath: "/admin/reports" });
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
        ? createReportsAdapter({
            mode: "readonly",
            supabase:
              (await createSupabaseServerClient()) as unknown as AdminNextReportsReadonlySupabaseClient,
            accountId: session.accountId,
          })
        : createReportsAdapter(dataSourceMode);
    const fixture = await adapter.getReports();
    content = <EvoReports fixture={fixture} />;
  } catch (error) {
    const state = buildAdminNextReadErrorState({ area: "reportes", error });
    content = (
      <EvoDataState
        {...state}
        actionHref="/admin/reports"
        actionLabel="Reintentar"
        testId="admin-next-reports-error"
      />
    );
  }

  return (
    <EvoShell
      userName={session.displayName}
      accountLabel={session.email}
      role={session.role}
      activeKey="reports"
    >
      {content}
    </EvoShell>
  );
}
