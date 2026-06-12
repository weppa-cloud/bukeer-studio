import { EvoAccount } from "@/components/admin-next/evolucion/evo-account";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { accountFixture } from "@/lib/admin-next/fixtures/account";
import { assertAdminNextSmokeAccess } from "@/lib/admin-next/route-boundary";
import type { AdminNextSessionContext } from "@/lib/admin-next/session/get-admin-session-context";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Mi cuenta Smoke | Bukeer Admin Next",
};

const smokeSession: Extract<
  AdminNextSessionContext,
  { status: "authenticated" }
> = {
  status: "authenticated",
  userId: "account-smoke-user",
  email: "account-smoke@bukeer.local",
  accountId: "account-smoke-account",
  role: "admin",
  displayName: "Account Smoke",
  permissions: ["admin_next.view", "planner.view", "trace.view"],
  flags: {
    adminNextPrototype: true,
    adminNextBetaReadonlyEnabled: false,
    adminNextBetaAccountAllowed: false,
    adminNextBetaRoleAllowed: false,
    adminNextBetaReadonly: false,
    adminNextExternalHandoff: false,
    adminNextItineraryWrites: false,
  },
};

export default async function AdminNextAccountSmokePage() {
  await assertAdminNextSmokeAccess();

  return (
    <EvoShell
      userName={smokeSession.displayName}
      accountLabel={smokeSession.email}
      role={smokeSession.role}
      activeKey="config"
    >
      <EvoAccount fixture={accountFixture} />
    </EvoShell>
  );
}
