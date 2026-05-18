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
    await expect(page.getByText('Approval required').first()).toBeVisible();
    await expect(page.getByText('Missing data').first()).toBeVisible();
  });
});
