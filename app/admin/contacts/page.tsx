import type { ReactNode } from "react";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { EvoContacts } from "@/components/admin-next/evolucion/evo-contacts";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
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
  title: "Contactos | Bukeer Admin Next",
};

export default async function AdminNextContactsPage() {
  const session = await requireAdminNextSession({
    nextPath: "/admin/contacts",
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
    const fixture = await adapter.getContacts();
    const total = fixture.contacts.length;
    const clients = fixture.contacts.filter((contact) =>
      contact.badges.includes("Cliente"),
    ).length;
    const providers = fixture.contacts.filter((contact) =>
      contact.badges.includes("Proveedor"),
    ).length;
    const subtitle = `${total} contactos · ${clients} clientes, ${providers} proveedores`;
    content = <EvoContacts fixture={fixture} subtitle={subtitle} />;
  } catch (error) {
    const state = buildAdminNextReadErrorState({ area: "contactos", error });
    content = (
      <EvoDataState
        {...state}
        actionHref="/admin/contacts"
        actionLabel="Reintentar"
        testId="admin-next-contacts-error"
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
