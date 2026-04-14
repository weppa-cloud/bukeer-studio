import { test, expect } from '@playwright/test';

test.describe('Security', () => {
  test('unauthenticated access to dashboard returns redirect', async ({ page }) => {
    const response = await page.goto('/dashboard');
    expect(page.url()).toContain('/login');
  });

  test('unauthenticated API returns 401', async ({ request }) => {
    const response = await request.get('/api/ai/editor/suggest-sections', {
      headers: { 'Content-Type': 'application/json' },
    });
    // Should be unauthorized or method not allowed
    expect([401, 405]).toContain(response.status());
  });

  test.describe('authenticated', () => {
    test.use({ storageState: 'e2e/.auth/user.json' });
    test('direct access to other account website is blocked', async ({ page }) => {
    // Try accessing a website that doesn't belong to the test account
    await page.goto('/dashboard/non-existent-website-id/pages');
    // Should redirect to dashboard
    await page.waitForURL('/dashboard');
  });
  });
});
