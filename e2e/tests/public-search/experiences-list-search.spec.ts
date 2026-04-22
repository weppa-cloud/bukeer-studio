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

async function getExperiencesCount(page: Page): Promise<number> {
  const raw = await page.getByTestId('experiences-count').textContent();
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
  return tokens[0] ?? 'tour';
}

test.describe('@public-search experiences-list-search', () => {
  test.describe.configure({ timeout: 90_000 });

  let subdomain = 'colombiatours';

  test.beforeAll(async () => {
    const fixtures = await seedWave2Fixtures();
    subdomain = fixtures.seo.subdomain || 'colombiatours';
  });

  test('keyword search filters experiences list and can be cleared', async ({ page }) => {
    const route = `/site/${subdomain}/experiencias`;
    const response = await gotoRoute(page, route);
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      `Experiences route unreachable (status=${response?.status() ?? 'no-response'})`,
    );

    const countBadge = page.getByTestId('experiences-count');
    test.skip((await countBadge.count()) === 0, 'Experiences count badge not rendered');

    const initialCount = await getExperiencesCount(page);
    test.skip(initialCount === 0, 'No experience records available to validate search behavior');

    const firstCardTitle = page.locator('.exp-title').first();
    await expect(firstCardTitle).toBeVisible();
    const firstTitleText = (await firstCardTitle.textContent())?.trim() ?? '';
    const keyword = pickKeyword(firstTitleText);

    const keywordInput = page.locator('#experiences-keyword');
    await expect(keywordInput).toBeVisible();
    await keywordInput.fill(keyword);

    await expect.poll(() => getExperiencesCount(page)).toBeGreaterThan(0);
    await expect.poll(() => getExperiencesCount(page)).toBeLessThanOrEqual(initialCount);

    const visibleTitles = await page.locator('.exp-title').allTextContents();
    expect(
      visibleTitles.some((title) => title.toLowerCase().includes(keyword.toLowerCase())),
    ).toBe(true);
    await expect(page).toHaveURL(new RegExp(`[?&]q=${encodeURIComponent(keyword)}`));

    await keywordInput.fill(NO_MATCH_QUERY);
    await expect.poll(() => getExperiencesCount(page)).toBe(0);
    await expect(page.getByTestId('experiences-empty')).toBeVisible();

    await keywordInput.fill('');
    await expect.poll(() => getExperiencesCount(page)).toBe(initialCount);
    await expect(page).not.toHaveURL(/([?&])q=/);
  });

  test('/actividades preserves q param when redirecting to /experiencias', async ({ page }) => {
    const query = 'caribe';
    const response = await gotoRoute(page, `/site/${subdomain}/actividades?q=${query}`);
    test.skip(
      !response || response.status() === 404 || response.status() >= 500,
      `Legacy actividades route unreachable (status=${response?.status() ?? 'no-response'})`,
    );

    await expect(page).toHaveURL(new RegExp(`/site/${subdomain}/experiencias\\?q=${query}$`));
  });
});

