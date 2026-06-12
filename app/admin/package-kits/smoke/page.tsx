import { EvoPackageKits } from "@/components/admin-next/evolucion/evo-package-kits";
import { EvoShell } from "@/components/admin-next/evolucion/evo-shell";
import { packageKitsFixture } from "@/lib/admin-next/fixtures/package-kits";
import { assertAdminNextSmokeAccess } from "@/lib/admin-next/route-boundary";
import type { AdminNextSessionContext } from "@/lib/admin-next/session/get-admin-session-context";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Package Kits Smoke | Bukeer Admin Next",
};

const smokeSession: Extract<
  AdminNextSessionContext,
  { status: "authenticated" }
> = {
  status: "authenticated",
  userId: "package-kits-smoke-user",
  email: "package-kits-smoke@bukeer.local",
  accountId: "package-kits-smoke-account",
  role: "admin",
  displayName: "Package Kits Smoke",
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

export default async function AdminNextPackageKitsSmokePage() {
  await assertAdminNextSmokeAccess();

  const active = packageKitsFixture.kits.filter(
    (kit) => kit.status === "active",
  ).length;
  const subtitle = `Package Kits · ${packageKitsFixture.kits.length} paquetes · ${active} activos`;

  return (
    <EvoShell
      userName={smokeSession.displayName}
      accountLabel={smokeSession.email}
      role={smokeSession.role}
      activeKey="kits"
    >
      <EvoPackageKits fixture={packageKitsFixture} subtitle={subtitle} />
    </EvoShell>
  );
}
