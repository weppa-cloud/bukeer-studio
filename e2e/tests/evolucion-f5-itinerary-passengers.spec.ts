// F5 — Pasajeros de itinerario (paridad Flutter → Next).
// Verifica create/edit/delete real sobre public.passenger con demo@demo.bukeer.com.

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";
const ENABLE_WRITE_E2E = process.env.ADMIN_NEXT_E2E_WRITE_PASSENGERS === "true";

const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };

type DemoPassengerTarget = {
  accountId: string;
  itineraryId: string;
};

type PassengerRow = {
  id: string | number;
  account_id: string;
  itinerary_id: string;
  name: string | null;
  last_name: string | null;
  type_id: string | null;
  number_id: string | null;
  nationality: string | null;
  birth_date: string | null;
  email: string | null;
  phone_number: string | null;
  gender: string | null;
  is_main_passenger: boolean | null;
};

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function loginAsDemo(page: Page, itineraryId: string) {
  await page.goto(
    `/login?next=/admin/itineraries/${itineraryId}?tab=passengers`,
    GOTO_READY,
  );
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
  await page.waitForURL(`**/admin/itineraries/${itineraryId}**`, {
    timeout: 60_000,
  });
  await expect(page.getByTestId("admin-next-evo-shell")).toBeVisible({
    timeout: 60_000,
  });
}

async function findDemoItinerary(): Promise<DemoPassengerTarget | null> {
  const supabase = serviceClient();
  if (!supabase) return null;

  const { data: contacts, error: contactError } = await supabase
    .from("contacts")
    .select("account_id")
    .eq("email", DEMO_EMAIL)
    .is("deleted_at", null)
    .limit(1);

  if (contactError) throw contactError;
  const accountId = contacts?.[0]?.account_id as string | undefined;
  if (!accountId) return null;

  const { data: itineraries, error: itineraryError } = await supabase
    .from("itineraries")
    .select("id")
    .eq("account_id", accountId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1);

  if (itineraryError) throw itineraryError;
  const itineraryId = itineraries?.[0]?.id as string | undefined;
  if (!itineraryId) return null;

  return { accountId, itineraryId };
}

async function readPassengerByName(
  target: DemoPassengerTarget,
  firstName: string,
): Promise<PassengerRow | null> {
  const supabase = serviceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("passenger")
    .select(
      "id,account_id,itinerary_id,name,last_name,type_id,number_id,nationality,birth_date,email,phone_number,gender,is_main_passenger",
    )
    .eq("account_id", target.accountId)
    .eq("itinerary_id", target.itineraryId)
    .eq("name", firstName)
    .maybeSingle();

  if (error) throw error;
  return (data as PassengerRow | null) ?? null;
}

async function deleteE2EPassengers(target: DemoPassengerTarget) {
  const supabase = serviceClient();
  if (!supabase) return;

  const { error } = await supabase
    .from("passenger")
    .delete()
    .eq("account_id", target.accountId)
    .eq("itinerary_id", target.itineraryId)
    .like("name", "[E2E][F5]%");

  if (error) throw error;
}

test.describe("Evolución F5 — pasajeros de itinerario write parity (demo)", () => {
  test.setTimeout(120_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");
  test.skip(!ENABLE_WRITE_E2E, "ADMIN_NEXT_E2E_WRITE_PASSENGERS no habilitado");
  test.skip(
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
    "Supabase service role no definido para verificar BD",
  );

  test("crea, edita y elimina un pasajero temporal real desde la UI", async ({
    page,
  }) => {
    const target = await findDemoItinerary();
    test.skip(!target, "No hay itinerario demo disponible para F5");
    if (!target) return;

    const suffix = Date.now().toString(36);
    const firstName = `[E2E][F5] ${suffix}`;
    const editedFirstName = `[E2E][F5] ${suffix} edit`;

    await deleteE2EPassengers(target);

    try {
      await loginAsDemo(page, target.itineraryId);
      await page.goto(
        `/admin/itineraries/${target.itineraryId}?tab=passengers`,
        GOTO_READY,
      );
      await expect(
        page.getByTestId("admin-next-itinerary-tab-panel-passengers"),
      ).toBeVisible({ timeout: 60_000 });

      if (
        !(await page
          .getByTestId("admin-next-passenger-first-name-new")
          .isVisible())
      ) {
        await page.getByTestId("admin-next-passenger-add-toggle").click();
      }
      await page
        .getByTestId("admin-next-passenger-first-name-new")
        .fill(firstName);
      await page.getByTestId("admin-next-passenger-last-name-new").fill("Demo");
      await page
        .getByTestId("admin-next-passenger-document-type-new")
        .fill("CC");
      await page
        .getByTestId("admin-next-passenger-document-number-new")
        .fill(`F5-${suffix}`);
      await page
        .getByTestId("admin-next-passenger-nationality-new")
        .fill("Colombiana");
      await page
        .getByTestId("admin-next-passenger-birth-date-new")
        .fill("1990-01-01");
      await page
        .getByTestId("admin-next-passenger-email-new")
        .fill(`f5-${suffix}@example.test`);
      await page
        .getByTestId("admin-next-passenger-phone-new")
        .fill("+573001112233");
      await page.getByTestId("admin-next-passenger-gender-new").fill("F");
      await page.getByTestId("admin-next-passenger-save-new").click();

      await page.waitForURL(
        `**/admin/itineraries/${target.itineraryId}?tab=passengers`,
        { timeout: 60_000 },
      );

      await expect
        .poll(() => readPassengerByName(target, firstName), {
          timeout: 30_000,
        })
        .not.toBeNull();

      const createdRow = await readPassengerByName(target, firstName);
      expect(createdRow).toMatchObject({
        account_id: target.accountId,
        itinerary_id: target.itineraryId,
        last_name: "Demo",
        number_id: `F5-${suffix}`,
      });
      const passengerId = String(createdRow?.id ?? "");
      expect(passengerId).toBeTruthy();
      if (!passengerId) return;

      await expect(
        page.getByTestId(`admin-next-passenger-${passengerId}`),
      ).toContainText(firstName);

      await page
        .getByTestId(`admin-next-passenger-edit-toggle-${passengerId}`)
        .click();
      await page
        .getByTestId(`admin-next-passenger-first-name-${passengerId}`)
        .fill(editedFirstName);
      await page
        .getByTestId(`admin-next-passenger-document-number-${passengerId}`)
        .fill(`F5-EDIT-${suffix}`);
      await page
        .getByTestId(`admin-next-passenger-save-${passengerId}`)
        .click();
      await page.waitForURL(
        `**/admin/itineraries/${target.itineraryId}?tab=passengers`,
        { timeout: 60_000 },
      );

      await expect
        .poll(() => readPassengerByName(target, editedFirstName), {
          timeout: 30_000,
        })
        .toMatchObject({ number_id: `F5-EDIT-${suffix}` });

      const editedRow = await readPassengerByName(target, editedFirstName);
      expect(String(editedRow?.id ?? "")).toBe(passengerId);

      await page
        .getByTestId(`admin-next-passenger-delete-${passengerId}`)
        .click();
      await page.waitForURL(
        `**/admin/itineraries/${target.itineraryId}?tab=passengers`,
        { timeout: 60_000 },
      );

      await expect
        .poll(() => readPassengerByName(target, editedFirstName), {
          timeout: 30_000,
        })
        .toBeNull();
      await expect(
        page.getByTestId(`admin-next-passenger-${passengerId}`),
      ).toHaveCount(0);
    } finally {
      await deleteE2EPassengers(target);
      await expect
        .poll(() => readPassengerByName(target, firstName), {
          timeout: 10_000,
        })
        .toBeNull();
      await expect
        .poll(() => readPassengerByName(target, editedFirstName), {
          timeout: 10_000,
        })
        .toBeNull();
    }
  });
});
