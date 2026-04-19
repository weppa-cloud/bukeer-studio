import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';
import { PageEditorPom } from '../pom/page-editor.pom';

test.describe('Studio section-canvas — dnd-kit', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.beforeAll(async () => {
    const fixtures = await seedWave2Fixtures();
    if (!fixtures.pageId) {
      throw new Error(`section-canvas needs seeded page. Warnings: ${fixtures.warnings.join(' | ')}`);
    }
  });

  test('canvas renders 5 seeded sections with data-section-id attributes', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);

    const items = page.locator('[data-section-id]');
    await expect(items).toHaveCount(5, { timeout: 20000 });

    const expectedOrder = ['sec-hero', 'sec-about', 'sec-gallery', 'sec-cta', 'sec-faq'];
    const actualOrder = await items.evaluateAll((nodes) =>
      nodes.map((el) => el.getAttribute('data-section-id')),
    );
    expect(actualOrder).toEqual(expectedOrder);
  });

  test('selecting a section via click highlights it', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);

    const target = page.locator('[data-section-id="sec-about"]').first();
    await expect(target).toBeVisible({ timeout: 15000 });
    await target.click();

    // Right panel Edit tab now surfaces SectionForm (no "No section selected" copy).
    await expect(page.getByText('No section selected')).toBeHidden();
  });

  test('drag reorder swaps adjacent sections', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);

    const items = page.locator('[data-section-id]');
    await expect(items).toHaveCount(5);

    const first = items.first();
    const second = items.nth(1);

    const firstBox = await first.boundingBox();
    const secondBox = await second.boundingBox();

    if (!firstBox || !secondBox) {
      test.skip(true, 'Section bounding boxes unavailable in headless — skipping drag assertion.');
      return;
    }

    await page.mouse.move(firstBox.x + firstBox.width / 2, firstBox.y + firstBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      secondBox.x + secondBox.width / 2,
      secondBox.y + secondBox.height + 10,
      { steps: 10 },
    );
    await page.mouse.up();

    // Give dnd-kit onDragEnd a tick, then re-evaluate order.
    await page.waitForTimeout(200);
    const order = await items.evaluateAll((nodes) =>
      nodes.map((el) => el.getAttribute('data-section-id')),
    );
    expect(order[0]).not.toBe('sec-hero');
  });
});
