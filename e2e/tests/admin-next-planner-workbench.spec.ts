import { expect, test } from '@playwright/test';

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
});
