import type { ReactNode } from "react";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { EvoConversations } from "@/components/admin-next/evolucion/evo-conversations";
import { EvoDataState } from "@/components/admin-next/evolucion/evo-data-state";
import {
  createConversationsAdapter,
  type AdminNextConversationsReadonlySupabaseClient,
} from "@/lib/admin-next/conversations-adapter";
import { buildAdminNextReadErrorState } from "@/lib/admin-next/evolucion-state";
import { getAdminNextDataSourceMode } from "@/lib/admin-next/flags";
import { requireAdminNextSession } from "@/lib/admin-next/route-boundary";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Conversaciones | Bukeer Admin Next",
};

export default async function AdminNextConversationsPage() {
  const session = await requireAdminNextSession({
    nextPath: "/admin/conversations",
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
        ? createConversationsAdapter({
            mode: "readonly",
            supabase:
              (await createSupabaseServerClient()) as unknown as AdminNextConversationsReadonlySupabaseClient,
            accountId: session.accountId,
          })
        : createConversationsAdapter(dataSourceMode);
    const fixture = await adapter.getConversations();
    const open = fixture.conversations.filter(
      (conversation) => conversation.status === "open",
    ).length;
    const waiting = fixture.conversations.filter(
      (conversation) => conversation.status === "waiting",
    ).length;
    const subtitle = `CRM · ${open} abiertas, ${waiting} en espera`;
    content = <EvoConversations fixture={fixture} subtitle={subtitle} />;
  } catch (error) {
    const state = buildAdminNextReadErrorState({
      area: "conversaciones",
      error,
    });
    content = (
      <EvoDataState
        {...state}
        actionHref="/admin/conversations"
        actionLabel="Reintentar"
        testId="admin-next-conversations-error"
      />
    );
  }

  return (
    <EvoShell
      userName={session.displayName}
      accountLabel={session.email}
      role={session.role}
      activeKey="conv"
    >
      {content}
    </EvoShell>
  );
}
