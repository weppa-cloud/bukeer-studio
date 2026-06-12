// F9 — Contactos: lista readonly y detalle real contra Supabase.

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";
const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

type DemoContactTarget = {
  contactId: string;
  name: string;
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

async function findContactTarget(): Promise<DemoContactTarget | null> {
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

  const { data: contacts, error: contactError } = await supabase
    .from("contacts")
    .select("id,name,last_name,email")
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(20);

  if (contactError) throw contactError;
  const contact = contacts?.find((row) => row.id && (row.name || row.email));
  if (!contact) return null;

  return {
    contactId: contact.id as string,
    name:
      [contact.name as string | null, contact.last_name as string | null]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      (contact.email as string | null) ||
      "Contacto",
  };
}

test.describe("Evolucion F9 — contactos reales (demo)", () => {
  test.setTimeout(120_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase service role no definido para elegir target F9",
  );

  test("abre detalle de contacto desde lista readonly", async ({ page }) => {
    const target = await findContactTarget();
    test.skip(!target, "No hay contacto demo para F9");
    if (!target) return;

    await loginAsDemo(page, "/admin/contacts");

    await expect(page.getByTestId("admin-next-contacts-grid")).toBeVisible({
      timeout: 60_000,
    });
    const card = page.getByTestId(`admin-next-contact-${target.contactId}`);
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute("href", `/admin/contacts/${target.contactId}`);
    await card.click();

    await page.waitForURL(`**/admin/contacts/${target.contactId}`, {
      timeout: 60_000,
    });
    await expect(page.getByTestId("admin-next-contact-detail")).toBeVisible({
      timeout: 60_000,
    });
    await expect(page.getByTestId("admin-next-contact-detail")).toContainText(
      target.name,
    );
    await expect(page.getByTestId("admin-next-contact-profile")).toBeVisible();
    await expect(page.getByTestId("admin-next-contact-signals")).toBeVisible();
    await expect(page.getByTestId("admin-next-contact-itineraries")).toBeVisible();
  });
});
