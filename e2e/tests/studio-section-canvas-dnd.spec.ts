import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';
import { PageEditorPom } from '../pom/page-editor.pom';

test.describe('Studio section-canvas — dnd-kit @p0-editor', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.skip(({ isMobile }) => isMobile, 'Section canvas interactions are desktop-only.');

  test('canvas renders 5 seeded sections with data-section-id attributes', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    test.skip(!fixtures.pageId, `section-canvas needs seeded page. Warnings: ${fixtures.warnings.join(' | ')}`);
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
    test.skip(!fixtures.pageId, `section-canvas needs seeded page. Warnings: ${fixtures.warnings.join(' | ')}`);
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);

    const target = page.locator('[data-section-id="sec-about"]').first();
    await expect(target).toBeVisible({ timeout: 15000 });
    await target.click();

    // Right panel Edit tab now surfaces SectionForm (no "No section selected" copy).
    await expect(page.getByText('No section selected')).toBeHidden();
  });

  test('move-down control reorders adjacent sections', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    test.skip(!fixtures.pageId, `section-canvas needs seeded page. Warnings: ${fixtures.warnings.join(' | ')}`);
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);

    const items = page.locator('[data-section-id]');
    await expect(items).toHaveCount(5);

    const first = items.first();
    const firstWrapper = first.locator('xpath=..');
    await firstWrapper.hover();

    const moveDown = firstWrapper.locator('button[title="Move down"]').first();
    await expect(moveDown).toBeVisible({ timeout: 5000 });
    await moveDown.click();

    // Give dnd-kit onDragEnd a tick, then re-evaluate order.
    await page.waitForTimeout(350);
    const order = await items.evaluateAll((nodes) =>
      nodes.map((el) => el.getAttribute('data-section-id')),
    );
    expect(sections[0]).toBe('sec-hero');

    // Hover reveals the floating toolbar — click the section first so it's
    // selected (toolbar is also visible on select).
    await items.first().click();
    const moveDownButton = page.getByTestId('studio-canvas-move-down-sec-hero');
    await expect(moveDownButton).toBeVisible({ timeout: 10_000 });
    await moveDownButton.click();

    // Order update is synchronous through React state but we poll to tolerate
    // the next paint.
    await expect
      .poll(
        async () =>
          (
            await items.evaluateAll((nodes) =>
              nodes.map((el) => el.getAttribute('data-section-id')),
            )
          )[0],
        { timeout: 10_000 },
      )
      .not.toBe('sec-hero');
  });
});
