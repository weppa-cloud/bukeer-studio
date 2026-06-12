// F14 — Configuracion/usuarios: cuenta, usuarios y RBAC reales desde Supabase.

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";
const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

type DemoSettingsTarget = {
  accountName: string;
  accountWebsite: string;
  userId: string;
  userName: string;
  permissionId: string;
  permission: string;
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function loginAsDemo(page: Page, nextPath: string) {
  await page.goto(`/login?next=${encodeURIComponent(nextPath)}`, GOTO_READY);
  await page.waitForSelector('[data-testid="login-email"]', {
    timeout: 60_000,
  });
  await expect(page.getByTestId("login-submit")).toHaveAttribute(
    "data-hydrated",
    "true",
    { timeout: 60_000 },
  );
  await page.getByTestId("login-email").fill(DEMO_EMAIL);
  await page.getByTestId("login-password").fill(DEMO_PASSWORD);
  await page.getByTestId("login-submit").click();
  await page.waitForURL(`**${nextPath}**`, { timeout: 60_000 });
  await expect(page.getByTestId("admin-next-evo-shell")).toBeVisible({
    timeout: 60_000,
  });
}

async function findSettingsTarget(): Promise<DemoSettingsTarget | null> {
  const supabase = serviceClient();
  if (!supabase) return null;

  const { data: demoContacts, error: demoError } = await supabase
    .from("contacts")
    .select("account_id")
    .eq("email", DEMO_EMAIL)
    .is("deleted_at", null)
    .limit(1);

  if (demoError) throw demoError;
  const accountId = demoContacts?.[0]?.account_id as string | undefined;
  if (!accountId) return null;

  const [{ data: accounts, error: accountError }, rolesResult] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("name,website,mail")
        .eq("id", accountId)
        .limit(1),
      supabase
        .from("user_roles")
        .select("id,user_id,is_active,roles(role_name)")
        .eq("account_id", accountId)
        .limit(100),
    ]);

  if (accountError) throw accountError;
  if (rolesResult.error) throw rolesResult.error;

  const account = accounts?.[0];
  const roles = (rolesResult.data ?? []) as Array<Record<string, unknown>>;
  const role = roles.find((row) => row.id && row.user_id);
  const userId = role?.user_id as string | undefined;
  if (!account || !role || !userId) return null;

  const { data: contacts, error: contactError } = await supabase
    .from("contacts")
    .select("id,user_id,name,last_name,email")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .limit(1);

  if (contactError) throw contactError;
  const user = contacts?.[0];

  if (!account || !user) return null;

  return {
    accountName: account.name as string,
    accountWebsite:
      ((account.website as string | null) || (account.mail as string | null) || "Sin dominio"),
    userId: user.id as string,
    userName: fullName(user.name, user.last_name) || (user.email as string),
    permissionId: "admin-next-view",
    permission: "admin_next.view",
  };
}

function fullName(name: unknown, lastName: unknown): string {
  return [name, lastName]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean)
    .join(" ");
}

test.describe("Evolucion F14 — configuracion y usuarios reales (demo)", () => {
  test.setTimeout(120_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase service role no definido para elegir target F14",
  );

  test("muestra cuenta, usuarios y matriz RBAC reales en Settings", async ({ page }) => {
    const target = await findSettingsTarget();
    test.skip(!target, "No hay cuenta/usuarios/permisos demo disponibles para F14");
    if (!target) return;

    await loginAsDemo(page, "/admin/settings");

    await expect(page.getByTestId("admin-next-settings-root")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("admin-next-settings-agency")).toContainText(
      target.accountName,
    );
    await expect(page.getByTestId("admin-next-settings-agency")).toContainText(
      target.accountWebsite,
    );
    await expect(page.getByTestId(`admin-next-settings-user-${target.userId}`)).toContainText(
      target.userName,
    );
    await expect(
      page.getByTestId(`admin-next-settings-permission-${target.permissionId}`),
    ).toContainText(target.permission);
    await expect(page.getByTestId("admin-next-settings-signals")).toContainText(
      "Readonly",
    );
  });
});
