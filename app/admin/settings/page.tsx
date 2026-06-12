import type { ReactNode } from "react";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoSettings } from "@/components/admin-next/evolucion/evo-settings";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { buildAdminNextReadErrorState } from "@/lib/admin-next/evolucion-state";
import { getAdminNextDataSourceMode } from "@/lib/admin-next/flags";
import { requireAdminNextSession } from "@/lib/admin-next/route-boundary";
import {
  createSettingsAdapter,
  type AdminNextSettingsReadonlySupabaseClient,
} from "@/lib/admin-next/settings-adapter";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Configuracion | Bukeer Admin Next",
};

export default async function AdminNextSettingsPage() {
  const session = await requireAdminNextSession({
    nextPath: "/admin/settings",
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
        ? createSettingsAdapter({
            mode: "readonly",
            supabase:
              (await createSupabaseServerClient()) as unknown as AdminNextSettingsReadonlySupabaseClient,
            accountId: session.accountId,
          })
        : createSettingsAdapter(dataSourceMode);
    const fixture = await adapter.getSettings();
    content = <EvoSettings fixture={fixture} />;
  } catch (error) {
    const state = buildAdminNextReadErrorState({
      area: "configuracion",
      error,
    });
    content = (
      <EvoDataState
        {...state}
        actionHref="/admin/settings"
        actionLabel="Reintentar"
        testId="admin-next-settings-error"
      />
    );
  }

  return (
    <EvoShell
      userName={session.displayName}
      accountLabel={session.email}
      role={session.role}
      activeKey="config"
    >
      {content}
    </EvoShell>
  );
}
