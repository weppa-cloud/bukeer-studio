import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login with email and password', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email').fill('test@bukeer.com');
    await page.getByLabel('Password').fill('test-password');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL('/dashboard**');
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
    await page.goto('/login');
    await page.getByRole('link', { name: /forgot password/i }).click();
    await page.waitForURL('/forgot-password');

    await page.getByRole('textbox').fill('test@bukeer.com');
    await page.getByRole('button', { name: /send reset/i }).click();

    await expect(page.getByText(/check your email/i)).toBeVisible();
  });

  test('dashboard redirects unauthenticated user', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('/login**');
    expect(page.url()).toContain('/login');
  });
});
