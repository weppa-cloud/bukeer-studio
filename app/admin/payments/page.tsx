import { EvoPayments } from "@/components/admin-next/evolucion/evo-payments";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { paymentsFixture } from "@/lib/admin-next/fixtures/payments";
import { requireAdminNextSession } from "@/lib/admin-next/route-boundary";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pagos | Bukeer Admin Next",
};

export default async function AdminNextPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    batch?: string;
    method?: string;
  }>;
}) {
  const session = await requireAdminNextSession({
    nextPath: "/admin/payments",
    permissions: ["admin_next.view", "payments.manage"],
  });
  const resolvedSearchParams = (await searchParams) ?? {};

  return (
    <EvoShell
      userName={session.displayName}
      accountLabel={session.email}
      role={session.role}
      activeKey="pay"
    >
      <EvoPayments
        canManagePayments={session.permissions.includes("payments.manage")}
        fixture={paymentsFixture}
        searchParams={resolvedSearchParams}
      />
    </EvoShell>
  );
}
