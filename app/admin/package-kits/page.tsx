import type { ReactNode } from "react";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoPackageKits } from "@/components/admin-next/evolucion/evo-package-kits";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { buildAdminNextReadErrorState } from "@/lib/admin-next/evolucion-state";
import { getAdminNextDataSourceMode } from "@/lib/admin-next/flags";
import {
  createPackageKitsAdapter,
  type AdminNextPackageKitsReadonlySupabaseClient,
} from "@/lib/admin-next/package-kits-adapter";
import { requireAdminNextSession } from "@/lib/admin-next/route-boundary";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Package Kits | Bukeer Admin Next",
};

export default async function AdminNextPackageKitsPage() {
  const session = await requireAdminNextSession({
    nextPath: "/admin/package-kits",
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
        ? createPackageKitsAdapter({
            mode: "readonly",
            supabase:
              (await createSupabaseServerClient()) as unknown as AdminNextPackageKitsReadonlySupabaseClient,
            accountId: session.accountId,
          })
        : createPackageKitsAdapter(dataSourceMode);
    const fixture = await adapter.getPackageKits();

    const active = fixture.kits.filter((kit) => kit.status === "active").length;
    const subtitle = `Package Kits · ${fixture.kits.length} paquetes · ${active} activos`;
    content = <EvoPackageKits fixture={fixture} subtitle={subtitle} />;
  } catch (error) {
    const state = buildAdminNextReadErrorState({
      area: "package kits",
      error,
    });
    content = (
      <EvoDataState
        {...state}
        actionHref="/admin/package-kits"
        actionLabel="Reintentar"
        testId="admin-next-package-kits-error"
      />
    );
  }

  return (
    <EvoShell
      userName={session.displayName}
      accountLabel={session.email}
      role={session.role}
      activeKey="kits"
    >
      {content}
    </EvoShell>
  );
}
