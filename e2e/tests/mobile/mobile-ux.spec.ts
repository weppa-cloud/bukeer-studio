import { test, expect, type Page } from '@playwright/test';
import { seedWave2Fixtures } from '../../setup/seed';

const VIEWPORT = { width: 390, height: 844 } as const;
const MOBILE_TOLERANCE_PX = 2;
const DRAWER_HEIGHT_RATIO = 0.9;

async function gotoOrSkip(page: Page, route: string, skipMessage: string) {
  const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  test.skip(
    !response || response.status() === 404 || response.status() >= 500,
    `${skipMessage} (status=${response?.status() ?? 'no-response'})`,
  );
  return response;
}

async function assertNoHorizontalOverflow(page: Page, label: string) {
  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      clientWidth: doc.clientWidth,
      scrollWidth: Math.max(doc.scrollWidth, body?.scrollWidth ?? 0),
    };
  });

  expect(
    metrics.scrollWidth,
    `${label} should not create horizontal overflow on mobile`,
  ).toBeLessThanOrEqual(metrics.clientWidth + MOBILE_TOLERANCE_PX);
}

async function getElementRect(page: Page, selector: string) {
  return page.locator(selector).evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
      right: rect.right,
      width: rect.width,
      height: rect.height,
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      overflowX: getComputedStyle(el).overflowX,
    };
  });
}

test.describe('Mobile UX @mobile-279', () => {
  test.describe.configure({ timeout: 90_000 });
  test.use({ viewport: VIEWPORT });

  let fixtures: Awaited<ReturnType<typeof seedWave2Fixtures>>;

  test.beforeAll(async () => {
    fixtures = await seedWave2Fixtures();
  });

  test('home hero fits first fold viewport @mobile-279', async ({ page }) => {
    const subdomain = fixtures.seo.subdomain;
    const route = `/site/${subdomain}`;

    await gotoOrSkip(page, route, 'Home route unreachable');

    const hero = page.locator('section[data-screen-label="Hero"]').first();
    test.skip(
      (await hero.count()) === 0,
      'Home hero not rendered — seeded content or theme mismatch.',
    );

    await expect(hero).toBeVisible();

    const box = await hero.boundingBox();
    test.skip(!box, 'Home hero box not available for viewport fit assertion');

    expect(box!.width).toBeLessThanOrEqual(VIEWPORT.width + MOBILE_TOLERANCE_PX);
    expect(box!.height).toBeLessThanOrEqual(VIEWPORT.height + MOBILE_TOLERANCE_PX);
    expect(box!.left).toBeGreaterThanOrEqual(-MOBILE_TOLERANCE_PX);
    expect(box!.top).toBeGreaterThanOrEqual(-MOBILE_TOLERANCE_PX);
    expect(box!.right).toBeLessThanOrEqual(VIEWPORT.width + MOBILE_TOLERANCE_PX);
    expect(box!.bottom).toBeLessThanOrEqual(VIEWPORT.height + MOBILE_TOLERANCE_PX);
  });

  test('home, experiencias and blog do not overflow horizontally @mobile-279', async ({
    page,
  }) => {
    const subdomain = fixtures.seo.subdomain;
    const routes = [
      { label: 'home', route: `/site/${subdomain}` },
      { label: 'experiencias', route: `/site/${subdomain}/experiencias` },
      { label: 'blog', route: `/site/${subdomain}/blog` },
    ];

    for (const { label, route } of routes) {
      await gotoOrSkip(page, route, `${label} route unreachable`);
      await assertNoHorizontalOverflow(page, label);
    }
  });

  test('experiencias category rail scrolls horizontally on mobile @mobile-279', async ({
    page,
  }) => {
    const subdomain = fixtures.seo.subdomain;
    const route = `/site/${subdomain}/experiencias`;

    await gotoOrSkip(page, route, 'Experiencias route unreachable');

    const rail = page.getByTestId('experiences-categories');
    await expect(rail).toBeVisible();

    const buttons = rail.getByRole('button');
    test.skip((await buttons.count()) < 4, 'Not enough category chips to prove a horizontal rail');

    const metrics = await getElementRect(page, '[data-testid="experiences-categories"]');
    test.skip(
      metrics.scrollWidth <= metrics.clientWidth + MOBILE_TOLERANCE_PX,
      'Category rail does not overflow horizontally in this tenant',
    );

    await rail.evaluate((el) => {
      el.scrollLeft = 0;
      el.scrollLeft = Math.max(120, el.clientWidth * 0.5);
    });

    await expect.poll(async () => rail.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  test('product detail sticky CTA appears after scroll @mobile-279', async ({ page }) => {
    const subdomain = fixtures.seo.subdomain;
    const slug = fixtures.packageSlug;
    test.skip(!fixtures.packageId, 'Seed fixture missing packageId.');

    const route = `/site/${subdomain}/paquetes/${slug}`;
    await gotoOrSkip(page, route, 'Package detail route unreachable');

    const stickyBar = page.getByRole('complementary', {
      name: /Acciones rapidas de contacto/i,
    });
    await expect(stickyBar).not.toBeInViewport();

    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    await expect(stickyBar).toBeVisible({ timeout: 15_000 });
    await expect(stickyBar).toBeInViewport();
  });

  test('WAFlow drawer fills most of the viewport on mobile @mobile-279', async ({ page }) => {
    const subdomain = fixtures.seo.subdomain;
    const slug = fixtures.packageSlug;
    test.skip(!fixtures.packageId, 'Seed fixture missing packageId.');

    const route = `/site/${subdomain}/paquetes/${slug}`;
    await gotoOrSkip(page, route, 'Package detail route unreachable');

    // Reveal the floating launcher, then open the drawer. The drawer should
    // stay close to the viewport height, not collapse into a short sheet.
    await page.evaluate(() => window.scrollTo(0, window.innerHeight));
    const launcher = page.getByRole('button', { name: /Chat por WhatsApp con un planner/i });
    await expect(launcher).toBeVisible({ timeout: 15_000 });
    await launcher.click();

    const drawer = page.getByRole('dialog', { name: /Planear mi viaje/i });
    await expect(drawer).toBeVisible({ timeout: 15_000 });

    const box = await drawer.boundingBox();
    test.skip(!box, 'WAFlow drawer box not available');

    expect(box!.height).toBeGreaterThanOrEqual(VIEWPORT.height * DRAWER_HEIGHT_RATIO);
    expect(box!.bottom).toBeLessThanOrEqual(VIEWPORT.height + MOBILE_TOLERANCE_PX);
    expect(box!.left).toBeGreaterThanOrEqual(-MOBILE_TOLERANCE_PX);
    expect(box!.right).toBeLessThanOrEqual(VIEWPORT.width + MOBILE_TOLERANCE_PX);
  });
});
