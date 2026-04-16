import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const authFile = path.join(__dirname, '..', '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  // If stored auth is still valid (cookie not expired), reuse it
  if (fs.existsSync(authFile)) {
    const stored = JSON.parse(fs.readFileSync(authFile, 'utf-8'));
    const cookies: Array<{ name: string; expires?: number }> = stored.cookies || [];
    const authCookie = cookies.find(
      (c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token')
    );
    if (authCookie && authCookie.expires && authCookie.expires > Date.now() / 1000 + 3600) {
      // Cookie valid for at least 1 more hour — skip re-auth
      console.log('Auth cookie valid until', new Date(authCookie.expires * 1000).toISOString());
      return;
    }
  }

  const email = process.env.E2E_USER_EMAIL || 'consultoria@weppa.co';
  const password = process.env.E2E_USER_PASSWORD || 'Ingeniero1!';

  await page.goto('/login');

  // Wait for Suspense boundary (useSearchParams) to hydrate before interacting
  await page.waitForSelector('input[id="email"]', { timeout: 60000 });

  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('/dashboard**', { timeout: 30000 });
  await expect(page.getByText('My Websites')).toBeVisible();

  await page.context().storageState({ path: authFile });
});
