import { EvoAccount } from "@/components/admin-next/evolucion/evo-account";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { accountFixture } from "@/lib/admin-next/fixtures/account";
import { requireAdminNextSession } from "@/lib/admin-next/route-boundary";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mi cuenta | Bukeer Admin Next",
};

export default async function AdminNextAccountPage() {
  const session = await requireAdminNextSession({ nextPath: "/admin/account" });

  return (
    <EvoShell
      userName={session.displayName}
      accountLabel={session.email}
      role={session.role}
      activeKey="config"
    >
      <EvoAccount fixture={accountFixture} />
    </EvoShell>
  );
}
