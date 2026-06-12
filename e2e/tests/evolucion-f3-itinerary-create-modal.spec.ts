// F3 — Itinerarios cabecera/ciclo de vida, primer slice write-gated.
// Verifica que el modal real abre en la UI Evolución y que writes queda cerrado
// cuando ADMIN_NEXT_WRITES_ITINERARIES_ENABLED=false, sin mutar Supabase.

import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const DEMO_EMAIL = process.env.E2E_DEMO_EMAIL || "demo@demo.bukeer.com";
const DEMO_PASSWORD = process.env.E2E_DEMO_PASSWORD || "";
const ENABLE_WRITE_E2E =
  process.env.ADMIN_NEXT_E2E_WRITE_ITINERARIES === "true";

const GOTO_READY = { waitUntil: "domcontentloaded" as const, timeout: 60_000 };
const TEST_NAME_PREFIX = "[E2E][F3]";

async function loginAsDemo(page: Page) {
  await page.goto("/login?next=/admin/itineraries", GOTO_READY);
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
  await page.waitForURL("**/admin/itineraries**", { timeout: 60_000 });
  await expect(page.getByTestId("admin-next-evo-shell")).toBeVisible({
    timeout: 60_000,
  });
}

test.describe("Evolución F3 — crear itinerario write-gated (demo)", () => {
  test.setTimeout(90_000);
  test.skip(!DEMO_PASSWORD, "E2E_DEMO_PASSWORD no definido en el entorno");

  test("abre modal de creación y mantiene el submit cerrado sin flag de writes", async ({
    page,
  }) => {
    test.skip(
      process.env.ADMIN_NEXT_WRITES_ITINERARIES_ENABLED === "true",
      "Servidor ejecutándose con writes habilitado",
    );

    await loginAsDemo(page);
    await expect(page.getByTestId("admin-next-itineraries-list")).toBeVisible();

    await Promise.all([
      page.waitForURL("**/admin/itineraries?new=itinerary", {
        timeout: 60_000,
      }),
      page.getByTestId("admin-next-itineraries-new").click(),
    ]);

    await expect(
      page.getByTestId("admin-next-itinerary-create-modal"),
    ).toBeVisible();
    await expect(
      page.getByTestId("admin-next-itinerary-create-name"),
    ).toHaveValue("Viaje demo");
    await expect(
      page.getByTestId("admin-next-itinerary-write-disabled"),
    ).toContainText("requiere flag de writes");
    await expect(
      page.getByTestId("admin-next-itinerary-create-submit"),
    ).toBeDisabled();

    await Promise.all([
      page.waitForURL("**/admin/itineraries", { timeout: 60_000 }),
      page.getByTestId("admin-next-itinerary-create-cancel").click(),
    ]);
    await expect(
      page.getByTestId("admin-next-itinerary-create-modal"),
    ).toHaveCount(0);
  });

  test("crea y edita cabecera real con paridad Flutter y limpia la fila E2E", async ({
    page,
  }) => {
    test.skip(
      !ENABLE_WRITE_E2E,
      "ADMIN_NEXT_E2E_WRITE_ITINERARIES no habilitado",
    );
    test.skip(
      !process.env.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_SERVICE_ROLE_KEY no definido para cleanup",
    );

    const runId = Date.now().toString(36);
    const itineraryName = `${TEST_NAME_PREFIX} Cabecera demo ${runId}`;
    const updatedItineraryName = `${itineraryName} editado`;
    let cleanupName = itineraryName;
    let createdItineraryId: string | null = null;

    try {
      await loginAsDemo(page);
      await expect(
        page.getByTestId("admin-next-itineraries-list"),
      ).toBeVisible();

      await Promise.all([
        page.waitForURL("**/admin/itineraries?new=itinerary", {
          timeout: 60_000,
        }),
        page.getByTestId("admin-next-itineraries-new").click(),
      ]);

      await expect(
        page.getByTestId("admin-next-itinerary-create-modal"),
      ).toBeVisible();
      await expect(
        page.getByTestId("admin-next-itinerary-write-disabled"),
      ).toHaveCount(0);

      await page
        .getByTestId("admin-next-itinerary-create-name")
        .fill(itineraryName);
      await page
        .getByTestId("admin-next-itinerary-create-start")
        .fill("2026-08-10");
      await page
        .getByTestId("admin-next-itinerary-create-end")
        .fill("2026-08-15");
      await page.getByTestId("admin-next-itinerary-create-adults").fill("2");
      await page.getByTestId("admin-next-itinerary-create-children").fill("1");
      await page.getByTestId("admin-next-itinerary-create-pax").fill("3");
      await page
        .getByTestId("admin-next-itinerary-create-currency")
        .selectOption("USD");
      await page
        .getByTestId("admin-next-itinerary-create-language")
        .selectOption("en");
      await page
        .getByTestId("admin-next-itinerary-create-request-type")
        .selectOption("Cotizacion");
      await page
        .getByTestId("admin-next-itinerary-create-message")
        .fill("Created by Evolución F3 Playwright parity test");

      await Promise.all([
        page.waitForURL(/\/admin\/itineraries\/[0-9a-f-]{36}$/i, {
          timeout: 60_000,
        }),
        page.getByTestId("admin-next-itinerary-create-submit").click(),
      ]);

      createdItineraryId =
        page.url().match(/\/itineraries\/([0-9a-f-]{36})/i)?.[1] ?? null;
      expect(createdItineraryId).toBeTruthy();
      await expect(
        page.getByTestId("admin-next-itinerary-detail-page"),
      ).toBeVisible();
      await expect(
        page.getByRole("heading", { name: itineraryName }),
      ).toBeVisible();

      const row = await fetchCreatedItinerary(createdItineraryId!);

      expect(row).toMatchObject({
        id: createdItineraryId,
        name: itineraryName,
        start_date: "2026-08-10",
        end_date: "2026-08-15",
        passenger_count: 3,
        adults: 2,
        children: 1,
        currency_type: "USD",
        language: "en",
        request_type: "Cotizacion",
        status: "Presupuesto",
        personalized_message: "Created by Evolución F3 Playwright parity test",
        account_id: "a0000000-de00-0000-0000-000000000001",
      });
      expect(row.id_created_by).toBeTruthy();
      expect(row.agent).toBeTruthy();

      await Promise.all([
        page.waitForURL(
          new RegExp(`/admin/itineraries/${createdItineraryId}\\?edit=header$`),
          { timeout: 60_000 },
        ),
        page.getByTestId("admin-next-itinerary-edit").click(),
      ]);

      await expect(
        page.getByTestId("admin-next-itinerary-edit-modal"),
      ).toBeVisible();
      await expect(
        page.getByTestId("admin-next-itinerary-edit-disabled"),
      ).toHaveCount(0);

      await page
        .getByTestId("admin-next-itinerary-edit-name")
        .fill(updatedItineraryName);
      await page
        .getByTestId("admin-next-itinerary-edit-start")
        .fill("2026-08-11");
      await page
        .getByTestId("admin-next-itinerary-edit-end")
        .fill("2026-08-16");
      await page.getByTestId("admin-next-itinerary-edit-adults").fill("3");
      await page.getByTestId("admin-next-itinerary-edit-children").fill("1");
      await page.getByTestId("admin-next-itinerary-edit-pax").fill("4");
      await page
        .getByTestId("admin-next-itinerary-edit-currency")
        .selectOption("COP");
      await page
        .getByTestId("admin-next-itinerary-edit-language")
        .selectOption("es");
      await page
        .getByTestId("admin-next-itinerary-edit-request-type")
        .selectOption("Operacion");
      await page
        .getByTestId("admin-next-itinerary-edit-message")
        .fill("Updated by Evolución F3 Playwright parity test");

      cleanupName = updatedItineraryName;
      await Promise.all([
        page.waitForURL(
          new RegExp(`/admin/itineraries/${createdItineraryId}$`),
          { timeout: 60_000 },
        ),
        page.getByTestId("admin-next-itinerary-edit-submit").click(),
      ]);

      await expect(
        page.getByRole("heading", { name: updatedItineraryName }),
      ).toBeVisible();

      const updatedRow = await fetchCreatedItinerary(createdItineraryId!);

      expect(updatedRow).toMatchObject({
        id: createdItineraryId,
        name: updatedItineraryName,
        start_date: "2026-08-11",
        end_date: "2026-08-16",
        passenger_count: 4,
        adults: 3,
        children: 1,
        currency_type: "COP",
        language: "es",
        request_type: "Operacion",
        status: "Presupuesto",
        personalized_message: "Updated by Evolución F3 Playwright parity test",
        account_id: "a0000000-de00-0000-0000-000000000001",
      });
      expect(updatedRow.id_created_by).toBeTruthy();
      expect(updatedRow.agent).toBeTruthy();

      await expect(
        page.getByTestId("admin-next-itinerary-status-value"),
      ).toContainText("Presupuesto");
      await page.getByTestId("admin-next-itinerary-status-confirm").click();
      await expect(
        page.getByTestId("admin-next-itinerary-status-value"),
      ).toContainText("Confirmado", { timeout: 60_000 });

      const confirmedRow = await fetchCreatedItinerary(createdItineraryId!);

      expect(confirmedRow).toMatchObject({
        id: createdItineraryId,
        name: updatedItineraryName,
        status: "Confirmado",
        account_id: "a0000000-de00-0000-0000-000000000001",
      });
      expect(confirmedRow.confirmation_date).toBeTruthy();

      const statusHistory = await fetchStatusHistory(createdItineraryId!);

      expect(statusHistory).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            new_status: "Confirmado",
            previous_status: "Presupuesto",
            source: "admin_next_detail",
          }),
        ]),
      );
      expect(statusHistory[0]?.metadata).toMatchObject({
        action: "confirm",
        surface: "admin_next_itinerary_detail",
      });

      const correctedConfirmationDate = "2026-08-09";
      await page
        .getByTestId("admin-next-itinerary-confirmation-date")
        .fill(correctedConfirmationDate);
      await page
        .getByTestId("admin-next-itinerary-confirmation-date-reason")
        .fill("Correccion comercial validada por E2E F3");

      const correctionResponse = page.waitForResponse(
        (response) =>
          response.url().includes(`/admin/itineraries/${createdItineraryId}`) &&
          response.request().method() === "POST",
        { timeout: 60_000 },
      );
      await page
        .getByTestId("admin-next-itinerary-confirmation-date-save")
        .click();
      await correctionResponse;
      await expect(
        page.getByTestId("admin-next-itinerary-confirmation-date"),
      ).toHaveValue(correctedConfirmationDate, { timeout: 60_000 });

      const correctedRow = await fetchCreatedItinerary(createdItineraryId!);

      expect(correctedRow).toMatchObject({
        id: createdItineraryId,
        name: updatedItineraryName,
        status: "Confirmado",
        confirmation_date: correctedConfirmationDate,
        account_id: "a0000000-de00-0000-0000-000000000001",
      });

      const correctedHistory = await fetchStatusHistory(createdItineraryId!);

      expect(correctedHistory[0]).toMatchObject({
        new_status: "Confirmado",
        previous_status: "Confirmado",
        source: "confirmation_date_correction",
      });
      expect(correctedHistory[0]?.metadata).toMatchObject({
        new_confirmation_date: correctedConfirmationDate,
        reason: "Correccion comercial validada por E2E F3",
      });
    } finally {
      if (createdItineraryId) {
        await cleanupCreatedItinerary(createdItineraryId, cleanupName);
      }
    }
  });
});

async function fetchCreatedItinerary(itineraryId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("itineraries")
    .select(
      [
        "id",
        "name",
        "start_date",
        "end_date",
        "passenger_count",
        "adults",
        "children",
        "currency_type",
        "language",
        "request_type",
        "status",
        "personalized_message",
        "confirmation_date",
        "account_id",
        "id_created_by",
        "agent",
        "deleted_at",
      ].join(","),
    )
    .eq("id", itineraryId)
    .single();

  if (error)
    throw new Error(`Could not read created itinerary: ${error.message}`);
  return data;
}

async function fetchStatusHistory(itineraryId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("itinerary_status_history")
    .select("previous_status,new_status,source,metadata,changed_at")
    .eq("itinerary_id", itineraryId)
    .order("changed_at", { ascending: false });

  if (error) throw new Error(`Could not read status history: ${error.message}`);
  return data ?? [];
}

async function cleanupCreatedItinerary(
  itineraryId: string,
  itineraryName: string,
) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("itineraries")
    .delete()
    .eq("id", itineraryId)
    .eq("name", itineraryName)
    .like("name", `${TEST_NAME_PREFIX}%`);

  if (!error) return;

  const { error: softDeleteError } = await supabase
    .from("itineraries")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", itineraryId)
    .eq("name", itineraryName)
    .like("name", `${TEST_NAME_PREFIX}%`);

  if (softDeleteError) {
    throw new Error(
      `Could not clean created itinerary ${itineraryId}: ${softDeleteError.message}`,
    );
  }
}

function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase service credentials are required for F3 cleanup");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
