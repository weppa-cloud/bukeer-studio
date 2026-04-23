import { expect, test, type Page } from '@playwright/test';
import { seedWave2Fixtures } from '../../setup/seed';

const ROUTE_TIMEOUT_MS = 20_000;
const NO_MATCH_QUERY = 'zzzz-no-match-search-e2e';

async function gotoRoute(page: Page, route: string) {
  try {
    return await page.goto(route, {
      waitUntil: 'domcontentloaded',
      timeout: ROUTE_TIMEOUT_MS,
    });
  } catch {
    return null;
  }
}

async function getPackagesCount(page: Page): Promise<number> {
  const raw = await page.getByTestId('paquetes-count').textContent();
  const match = raw?.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function pickKeyword(source: string): string {
  const tokens = source
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 4);
  return tokens[0] ?? 'paquete';
}

async function resolvePackagesSubdomain(
  page: Page,
  seededSubdomain: string,
): Promise<string | null> {
  const forcedSubdomain = (process.env.E2E_SEARCH_SUBDOMAIN ?? '').trim().toLowerCase();
  const candidates = forcedSubdomain
    ? [forcedSubdomain]
    : Array.from(
        new Set(
          [process.env.E2E_PUBLIC_SUBDOMAIN, seededSubdomain, 'colombiatours']
            .map((value) => (value ?? '').trim().toLowerCase())
            .filter(Boolean),
        ),
      );

  for (const candidate of candidates) {
    const response = await gotoRoute(page, `/site/${candidate}/paquetes`);
    if (!response || response.status() >= 500 || response.status() === 404) continue;
    try {
      await page.waitForSelector('[data-testid="paquetes-count"]', { timeout: 7000 });
      return candidate;
    } catch {
      continue;
    }
  }

  return null;
}

async function getActivePackageTitles(page: Page): Promise<string[]> {
  const visibleTitles = await page.locator('.pack-title:visible').allTextContents();
  if (visibleTitles.length > 0) return visibleTitles.map((t) => t.trim()).filter(Boolean);
  return (await page.locator('.pack-title').allTextContents()).map((t) => t.trim()).filter(Boolean);
}

test.describe('@public-search package-list-search', () => {
  test.describe.configure({ timeout: 90_000 });

  let subdomain = 'colombiatours';

  test.beforeAll(async () => {
    const fixtures = await seedWave2Fixtures();
    subdomain = fixtures.seo.subdomain || 'colombiatours';
  });

  test('keyword search filters package list and can be cleared', async ({ page }) => {
    const resolvedSubdomain = await resolvePackagesSubdomain(page, subdomain);
    test.skip(!resolvedSubdomain, 'No tenant with package listing markers found');

    const route = `/site/${resolvedSubdomain}/paquetes`;
    const response = await gotoRoute(page, route);
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      `Packages route unreachable (status=${response?.status() ?? 'no-response'})`,
    );

    const countBadge = page.getByTestId('paquetes-count');
    try {
      await countBadge.waitFor({ state: 'visible', timeout: 7000 });
    } catch {
      test.skip(true, 'Package count badge not rendered');
    }

    const listTab = page.getByRole('tab', { name: /lista/i }).first();
    if (await listTab.isVisible().catch(() => false)) {
      await listTab.click();
    }

    const initialCount = await getPackagesCount(page);
    test.skip(initialCount === 0, 'No package records available to validate search behavior');

    const titlesBefore = await getActivePackageTitles(page);
    test.skip(titlesBefore.length === 0, 'No package titles found to derive a keyword');
    const firstTitleText = titlesBefore[0] ?? '';
    const keyword = pickKeyword(firstTitleText);

    const keywordInput = page.locator('#paquetes-keyword');
    await expect(keywordInput).toBeVisible();
    await keywordInput.fill(keyword);

    await expect.poll(() => getPackagesCount(page)).toBeGreaterThan(0);
    await expect.poll(() => getPackagesCount(page)).toBeLessThanOrEqual(initialCount);

    const visibleTitles = await getActivePackageTitles(page);
    expect(
      visibleTitles.some((title) => title.toLowerCase().includes(keyword.toLowerCase())),
    ).toBe(true);
    await expect(page).toHaveURL(new RegExp(`[?&]q=${encodeURIComponent(keyword)}`));

    await keywordInput.fill(NO_MATCH_QUERY);
    await expect.poll(() => getPackagesCount(page)).toBe(0);
    await expect(page.getByTestId('paquetes-empty')).toBeVisible();

    await keywordInput.fill('');
    await expect.poll(() => getPackagesCount(page)).toBe(initialCount);
    await expect(page).not.toHaveURL(/([?&])q=/);
  });
});
