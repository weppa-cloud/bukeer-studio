// F15 — Package Kits: lectura real de package_kits y package_kit_versions.

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";
const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 120_000 };

type PackageKitTarget = {
  id: string;
  name: string;
  destination: string;
  versionLabel: string;
};

type PackageKitRow = {
  id: string;
  name: string | null;
  destination: string | null;
  status: string | null;
  base_version_id: string | null;
};

type PackageKitVersionRow = {
  id: string;
  version_label: string | null;
  version_number: number | null;
  is_active: boolean | null;
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

async function findPackageKitTarget(): Promise<PackageKitTarget | null> {
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

  const { data: kits, error: kitError } = await supabase
    .from("package_kits")
    .select("id,name,destination,status,base_version_id,usage_count,updated_at")
    .eq("account_id", accountId)
    .order("usage_count", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(25);

  if (kitError) throw kitError;
  const rows = (kits ?? []) as PackageKitRow[];
  const kit = rows.find((row) => row.status === "active") ?? rows[0];
  if (!kit?.id || !kit.name) return null;

  const { data: versions, error: versionError } = await supabase
    .from("package_kit_versions")
    .select("id,version_label,version_number,is_active")
    .eq("account_id", accountId)
    .eq("package_kit_id", kit.id)
    .order("version_number", { ascending: false })
    .limit(20);

  if (versionError) throw versionError;
  const versionRows = (versions ?? []) as PackageKitVersionRow[];
  const version =
    versionRows.find((row) => row.id === kit.base_version_id) ??
    versionRows.find((row) => row.is_active) ??
    versionRows[0];

  return {
    id: kit.id,
    name: kit.name,
    destination: kit.destination || "Destino por definir",
    versionLabel: version?.version_label || "Sin version",
  };
}

test.describe("Evolucion F15 — Package Kits reales (demo)", () => {
  test.setTimeout(180_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase service role no definido para elegir target F15",
  );

  test("muestra package kit real con version, origen y acciones de aplicacion", async ({
    page,
  }) => {
    const target = await findPackageKitTarget();
    test.skip(!target, "No hay package kits demo disponibles para F15");
    if (!target) return;

    await loginAsDemo(page, "/admin/package-kits");

    await expect(page.getByTestId("admin-next-package-kits-root")).toBeVisible({
      timeout: 60_000,
    });
    await expect(
      page.getByTestId(`admin-next-package-kit-${target.id}`),
    ).toContainText(target.name);
    await expect(
      page.getByTestId(`admin-next-package-kit-${target.id}`),
    ).toContainText(target.destination);
    await expect(
      page.getByTestId(`admin-next-package-kit-${target.id}`),
    ).toContainText(target.versionLabel);
    await expect(
      page.getByTestId("admin-next-package-kits-selected"),
    ).toBeVisible();
    await expect(
      page.getByTestId("admin-next-package-kits-signals"),
    ).toContainText("Versiones");
    await expect(
      page.getByTestId("admin-next-package-kits-apply-preview"),
    ).toBeVisible();
    await expect(page.getByTestId("admin-next-nav-kits")).toHaveClass(/active/);
  });
});
