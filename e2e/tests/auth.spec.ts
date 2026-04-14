import { test, expect } from '@playwright/test';
import { getE2ECredentials } from './helpers';

test.describe('Authentication', () => {
  test('login with email and password', async ({ page }) => {
    const { email, password } = getE2ECredentials();
    await page.goto('/login');

    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/dashboard/, { timeout: 45000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('wrong@email.com');
    await page.getByLabel('Password').fill('wrong-password');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page.getByText(/invalid/i)).toBeVisible();
  });

  test('forgot password flow', async ({ page }) => {
    const { email } = getE2ECredentials();
    await page.goto('/login');
    await page.getByRole('link', { name: /forgot password/i }).click();
    await page.waitForURL('/forgot-password**');

    await page.getByRole('textbox').fill(email);
    await page.getByRole('button', { name: /send reset/i }).click();

    const outcome = await Promise.race([
      page
        .getByText(/check your email/i)
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => 'success')
        .catch(() => null),
      page
        .getByText(/for security purposes/i)
        .waitFor({ state: 'visible', timeout: 10000 })
        .then(() => 'rate_limit')
        .catch(() => null),
    ]);
    expect(outcome).toBeTruthy();
  });

  test('dashboard redirects unauthenticated user', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('/login**');
    expect(page.url()).toContain('/login');
  });
});
