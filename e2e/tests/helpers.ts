import { expect, Page } from '@playwright/test';
import { E2E_FIXTURE_IDS, seedWave2Fixtures } from '../setup/seed';

export { seedWave2Fixtures, E2E_FIXTURE_IDS };

export function getSeededPackageSlug(): string {
  return E2E_FIXTURE_IDS.packageSlug;
}

export function getSeededPageSlug(): string {
  return E2E_FIXTURE_IDS.pageSlug;
}

export function getSeededWebsiteId(): string {
  return process.env.E2E_WEBSITE_ID?.trim() || E2E_FIXTURE_IDS.websiteId;
}

export async function getSeededSeoItem(
  itemType: 'page' | 'package' | 'blog',
): Promise<{ pageId: string; slug: string }> {
  const fixtures = await seedWave2Fixtures();
  if (itemType === 'page') {
    if (!fixtures.pageId) throw new Error('Seed fixture missing pageId');
    return { pageId: fixtures.pageId, slug: fixtures.pageSlug };
  }
  if (itemType === 'package') {
    if (!fixtures.packageId) throw new Error('Seed fixture missing packageId');
    return { pageId: fixtures.packageId, slug: fixtures.packageSlug };
  }
  if (!fixtures.blogId) throw new Error('Seed fixture missing blogId');
  return { pageId: fixtures.blogId, slug: fixtures.blogSlug };
}

export function getE2ECredentials() {
  return {
    email: process.env.E2E_USER_EMAIL || 'test@bukeer.com',
    password: process.env.E2E_USER_PASSWORD || 'test-password',
  };
}

function extractWebsiteId(href: string): string {
  const match = href.match(/\/dashboard\/([^/]+)\//);
  if (!match?.[1]) {
    throw new Error(`Invalid website href format: ${href}`);
  }
  return match[1];
}

export async function createWebsiteViaWizard(page: Page): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto('/dashboard/new');
    await expect(page.getByRole('heading', { name: 'Choose a template' })).toBeVisible();

    await page.getByRole('button', { name: /^Corporate\b/i }).click();
    await expect(page.getByRole('heading', { name: 'Name your website' })).toBeVisible();

    const random = Math.floor(Math.random() * 100000);
    const uniqueName = `E2E Agency ${Date.now()} ${random}`;
    await page.getByPlaceholder('My Travel Agency').fill(uniqueName);
    await expect(page.getByPlaceholder('my-agency')).toHaveValue(/e2e-agency-/);
    await page.getByRole('button', { name: 'Next', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Review & Create' })).toBeVisible();
    await page.getByRole('button', { name: 'Create website' }).click();

    try {
      await page.waitForURL(/\/dashboard\/[^/]+\/pages/, { timeout: 45000 });
      return extractWebsiteId(page.url());
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error('Unable to create website via wizard');
}

export async function getFirstWebsiteId(page: Page): Promise<string> {
  const websiteIdOverride = process.env.E2E_WEBSITE_ID?.trim();
  if (websiteIdOverride) {
    return websiteIdOverride;
  }

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'My Websites' })).toBeVisible();

  const firstWebsiteLink = page.locator('a[href*="/dashboard/"][href*="/pages"]').first();
  try {
    await firstWebsiteLink.waitFor({ state: 'visible', timeout: 15000 });
    const href = await firstWebsiteLink.getAttribute('href');
    if (!href) {
      throw new Error('Could not detect website link from dashboard');
    }
    return extractWebsiteId(href);
  } catch {
    const hasEmptyState = await page.getByText('Create your first website').isVisible().catch(() => false);
    if (!hasEmptyState) {
      throw new Error('Dashboard did not load website links nor empty state');
    }
  }

  return createWebsiteViaWizard(page);
}

export async function gotoWebsiteSection(page: Page, section: string): Promise<string> {
  const websiteId = await getFirstWebsiteId(page);
  const targetPath = `/dashboard/${websiteId}/${section}`;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto(targetPath, { waitUntil: 'domcontentloaded', timeout: 45000 });
    if (page.url().includes(targetPath)) {
      return websiteId;
    }

    // Firefox occasionally lands on an intermediate route before auth/session settles.
    await page.waitForTimeout(500);
  }

  throw new Error(`Unable to navigate to ${targetPath}. Current URL: ${page.url()}`);
}
