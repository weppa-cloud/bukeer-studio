import { expect, test, type Page } from '@playwright/test';

const PRODUCTION_WRITE_ROUTE =
  /\/(?:api\/(?:waflow|bookings?|reservations?|payments?|suppliers?|proposals?|quotes?)|rest\/v1|functions\/v1)/i;

async function blockProductionWriteRoutes(page: Page) {
  const blockedMutations: string[] = [];

  await page.route('**/*', async (route) => {
    const request = route.request();
    const method = request.method();
    const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (isMutation && PRODUCTION_WRITE_ROUTE.test(request.url())) {
      blockedMutations.push(`${method} ${request.url()}`);
      await route.fulfill({
        status: 418,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'blocked by draft-only handoff e2e' }),
      });
      return;
    }

    await route.continue();
  });

  return blockedMutations;
}

test.describe('Admin Next Planner Workbench prototype', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('renders protected fixture-first workbench without writes', async ({ page }) => {
    await page.goto('/admin/prototype/planner-workbench', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('planner-workbench-hydrated')).toBeAttached();

    await expect(page.getByRole('heading', { name: /Planner Workbench/i })).toBeVisible();
    await expect(page.getByText('Human-Agent OS')).toBeVisible();
    await expect(page.getByText('Not ready to send')).toBeVisible();
    await expect(page.getByText('Approval required').first()).toBeVisible();
    await expect(page.getByText('Public proposal send is blocked')).toBeVisible();
    await expect(page.getByTestId('draft-action-panel')).toBeVisible();
    await expect(page.getByText('Bukeer DraftAction review')).toBeVisible();
    await expect(
      page.getByText('Safety boundary: not sent, not reserved, not paid, not confirmed.').first(),
    ).toBeVisible();
    await expect(page.getByText('Fixture data only')).toBeVisible();

    await page.getByRole('button', { name: /Inspect trace/i }).first().click();
    await expect(page.getByRole('heading', { name: 'Agent trace' })).toBeVisible();
    await expect(page.getByText('Hidden chain-of-thought is not shown')).toBeVisible();
  });

  test('keeps critical state visible on mobile review width', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/admin/prototype/planner-workbench', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('planner-workbench-hydrated')).toBeAttached();

    await expect(page.getByText('Planner queue')).toBeVisible();
    await expect(page.getByText('Itinerary Manifest')).toBeVisible();
    await expect(page.getByText('Draft-only actions')).toBeVisible();
    await expect(page.getByText('Approval required').first()).toBeVisible();
    await expect(page.getByText('Missing data').first()).toBeVisible();
  });

  test('applies dark appearance to the workbench and trace inspector', async ({ page }) => {
    await page.goto('/admin/prototype/planner-workbench', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('planner-workbench-hydrated')).toBeAttached();

    await page.getByTestId('planner-workbench-dark-mode').click();
    await expect(page.getByTestId('planner-workbench-root')).toHaveAttribute('data-appearance', 'dark');

    await page.getByRole('button', { name: /Inspect trace/i }).first().click();
    await expect(page.getByTestId('trace-drawer-content')).toHaveAttribute('data-appearance', 'dark');
    await expect(page.getByText('Human approval boundary')).toBeVisible();
  });

  test('keeps draft-only actions local when users review a draft', async ({ page }) => {
    await page.goto('/admin/prototype/planner-workbench', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('planner-workbench-hydrated')).toBeAttached();

    await page.getByRole('button', { name: /Review locally/i }).first().click();

    await expect(
      page.getByText(/Reviewed draft draft-action-missing-data-request locally/i),
    ).toBeVisible();
    await expect(
      page.getByText(/No send, reservation, payment or confirmation ran/i),
    ).toBeVisible();
  });

  test('surfaces draft handoff state and blocks production write routes', async ({ page }) => {
    const blockedMutations = await blockProductionWriteRoutes(page);

    await page.goto('/admin/prototype/planner-workbench', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('planner-workbench-hydrated')).toBeAttached();

    const draftPanel = page.getByTestId('draft-action-panel');
    await expect(draftPanel).toBeVisible();
    await expect(draftPanel.getByText('Local simulation only')).toBeVisible();
    await expect(page.getByText('Fixture data only')).toBeVisible();

    const travelerHandoff = page.locator(
      '[data-draft-action-id="draft-action-missing-data-request"]',
    );
    await expect(travelerHandoff).toBeVisible();
    await expect(travelerHandoff.getByText('Draft Created')).toBeVisible();
    await expect(travelerHandoff.getByText('Required human action')).toBeVisible();
    await expect(travelerHandoff.getByText(/send manually/i)).toBeVisible();
    await expect(
      travelerHandoff.getByText('Safety boundary: not sent, not reserved, not paid, not confirmed.'),
    ).toBeVisible();

    await travelerHandoff.getByRole('button', { name: /Edit locally/i }).click();
    await expect(
      page.getByText(/Opened local edit state.*No production write was executed/i),
    ).toBeVisible();

    await travelerHandoff.getByRole('button', { name: /Review locally/i }).click();
    await expect(
      page.getByText(/No send, reservation, payment or confirmation ran/i),
    ).toBeVisible();

    expect(blockedMutations).toEqual([]);
  });

  test('creates a mocked WhatsApp handoff without sending, reserving, paying or confirming', async ({
    page,
  }) => {
    test.skip(
      process.env.ADMIN_NEXT_E2E_EXTERNAL_HANDOFF !== 'true',
      'Set ADMIN_NEXT_E2E_EXTERNAL_HANDOFF=true and Admin Next beta handoff flags to run this gated preview flow.',
    );

    const blockedMutations = await blockProductionWriteRoutes(page);

    await page.route('**/api/admin-next/planner-workbench/whatsapp-handoff', async (route) => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            referenceCode: 'AN-WA-E2E-20260519',
            whatsappUrl: 'https://wa.me/573005550198?text=Hola',
            waMeUrl: 'https://wa.me/573005550198?text=Hola',
            expiresAt: '2026-05-26T15:04:03.000Z',
            status: 'created',
            sent: false,
            notSent: true,
            manualSendRequired: true,
            safetyBoundary: {
              notReserved: true,
              notPaid: true,
              notConfirmed: true,
            },
          },
        }),
      });
    });

    await page.goto('/admin/prototype/planner-workbench', { waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('planner-workbench-hydrated')).toBeAttached();

    const travelerHandoff = page.locator(
      '[data-draft-action-id="draft-action-missing-data-request"]',
    );
    await expect(travelerHandoff.getByRole('button', { name: /Create WhatsApp handoff/i })).toBeVisible();

    await travelerHandoff.getByRole('button', { name: /Create WhatsApp handoff/i }).click();

    const handoffSuccess = travelerHandoff.getByTestId('whatsapp-handoff-success');
    await expect(handoffSuccess.getByText('WhatsApp handoff created')).toBeVisible();
    await expect(handoffSuccess.getByText('Not sent')).toBeVisible();
    await expect(handoffSuccess.getByText(/Human must open and send manually/i)).toBeVisible();
    await expect(handoffSuccess.getByText(/not reserved, not paid, not confirmed/i)).toBeVisible();
    await expect(handoffSuccess.getByText('AN-WA-E2E-20260519')).toBeVisible();
    await expect(handoffSuccess.getByText('wa.me/573005550198')).toBeVisible();

    expect(blockedMutations).toEqual([]);
  });
});
