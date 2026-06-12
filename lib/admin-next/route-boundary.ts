import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { AdminPermission } from "@bukeer/admin-contract";
import {
  evolucionThemeMetadata,
  getEvolucionThemeStyle,
} from "@/lib/admin-next/evolucion-theme";
import {
  getAdminSessionContext,
  hasAdminPermission,
} from "@/lib/admin-next/session/get-admin-session-context";

export async function requireAdminNextSession({
  nextPath,
  permission = "admin_next.view",
  permissions,
}: {
  nextPath: string;
  permission?: AdminPermission;
  permissions?: AdminPermission[];
}) {
  const session = await getAdminSessionContext();
  const requiredPermissions = permissions ?? [permission];

  if (!session.flags.adminNextPrototype) {
    notFound();
  }

  if (session.status === "unauthenticated") {
    redirect(`/login?next=${nextPath}`);
  }

  if (session.status !== "authenticated") {
    notFound();
  }

  if (
    requiredPermissions.some(
      (requiredPermission) => !hasAdminPermission(session, requiredPermission),
    )
  ) {
    notFound();
  }

  return session;
}

export function getAdminNextEvolucionTheme() {
  return {
    presetSlug: evolucionThemeMetadata.presetSlug,
    styles: {
      light: getEvolucionThemeStyle("light"),
      dark: getEvolucionThemeStyle("dark"),
    },
  };
}

export async function assertAdminNextSmokeAccess() {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  if (process.env.ADMIN_NEXT_PROTOTYPE_SMOKE_ENABLED !== "true") {
    notFound();
  }

  const expectedToken = process.env.ADMIN_NEXT_PROTOTYPE_SMOKE_TOKEN;
  if (!expectedToken) {
    notFound();
  }

  const requestHeaders = await headers();
  const requestCookies = await cookies();
  const actualToken =
    requestHeaders.get("x-admin-next-smoke-token") ||
    requestCookies.get("admin_next_smoke_token")?.value;

  if (actualToken !== expectedToken) {
    notFound();
  }
}
