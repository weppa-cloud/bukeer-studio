import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(__dirname, '..', '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  const email = process.env.E2E_USER_EMAIL || 'consultoria@weppa.co';
  const password = process.env.E2E_USER_PASSWORD || 'Ingeniero1!';

  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('/dashboard**');
  await expect(page.getByText('My Websites')).toBeVisible();

  await page.context().storageState({ path: authFile });
});
