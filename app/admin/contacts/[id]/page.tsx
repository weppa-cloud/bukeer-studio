import type { ReactNode } from "react";
import { EvoContactDetail } from "@/components/admin-next/evolucion/evo-contact-detail";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import {
  createContactsAdapter,
  type AdminNextContactsReadonlySupabaseClient,
} from "@/lib/admin-next/contacts-adapter";
import { buildAdminNextReadErrorState } from "@/lib/admin-next/evolucion-state";
import { getAdminNextDataSourceMode } from "@/lib/admin-next/flags";
import { requireAdminNextSession } from "@/lib/admin-next/route-boundary";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Detalle de contacto | Bukeer Admin Next",
};

export default async function AdminNextContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdminNextSession({
    nextPath: `/admin/contacts/${id}`,
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
        ? createContactsAdapter({
            mode: "readonly",
            supabase:
              (await createSupabaseServerClient()) as unknown as AdminNextContactsReadonlySupabaseClient,
            accountId: session.accountId,
          })
        : createContactsAdapter(dataSourceMode);
    const detail = await adapter.getContactDetail(id);

    content = detail ? (
      <EvoContactDetail detail={detail} />
    ) : (
      <EvoDataState
        kind="empty"
        title="Contacto no encontrado"
        description="Este contacto no existe para la cuenta actual o ya no esta disponible en el backend compartido."
        actionHref="/admin/contacts"
        actionLabel="Volver a contactos"
        testId="admin-next-contact-detail-empty"
      />
    );
  } catch (error) {
    const state = buildAdminNextReadErrorState({
      area: "el detalle de contacto",
      error,
    });
    content = (
      <EvoDataState
        {...state}
        actionHref={`/admin/contacts/${id}`}
        actionLabel="Reintentar"
        testId="admin-next-contact-detail-error"
      />
    );
  }

  return (
    <EvoShell
      userName={session.displayName}
      accountLabel={session.email}
      role={session.role}
      activeKey="contacts"
    >
      {content}
    </EvoShell>
  );
}
