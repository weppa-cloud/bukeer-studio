import { test, expect } from '@playwright/test';
import { getFirstWebsiteId, seedWave2Fixtures } from './helpers';
import { PageEditorPom } from '../pom/page-editor.pom';

const SECTION_LABELS = [
  'Hero',
  'Hero with Image',
  'Hero with Video',
  'Hero Minimal',
  'Text',
  'Rich Text',
  'Text + Image',
  'About',
  'Features',
  'Features Grid',
  'Destinations',
  'Hotels',
  'Activities',
  'Testimonials',
  'Testimonials Carousel',
  'Logo Cloud',
  'Partners',
  'Statistics',
  'Gallery',
  'Gallery Grid',
  'Pricing',
  'Call to Action',
  'CTA Banner',
  'Newsletter',
  'Contact Form',
  'FAQ',
  'FAQ Accordion',
  'Blog Grid',
] as const;

test.describe('Section picker — matrix', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.skip(({ isMobile }) => isMobile, 'Section picker validation is desktop-only.');

  test.beforeAll(async () => {
    await seedWave2Fixtures();
  });

  test('all registered section labels appear in Add Section dialog', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);

    // Clear selection → open picker via right-panel "Add Section" CTA.
    await editor.openAddSection();

    const dialog = page.getByRole('dialog');
    const optionButtons = dialog.locator('div.grid.grid-cols-2 > button');
    await expect(dialog.getByRole('heading', { name: 'Add Section' })).toBeVisible({
      timeout: 15000,
    });

    for (const label of SECTION_LABELS) {
      await expect(
        optionButtons.filter({
          has: dialog.getByText(new RegExp(`^${label}$`, 'i')),
        }).first(),
      ).toHaveCount(1);
    }
  });

  test('search filter narrows results to matching types', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);
    await editor.openAddSection();

    const dialog = page.getByRole('dialog');
    const optionButtons = dialog.locator('div.grid.grid-cols-2 > button');
    await dialog.getByPlaceholder('Search sections...').fill('faq');

    await expect(optionButtons.filter({ has: dialog.getByText(/^FAQ$/) })).toHaveCount(1);
    await expect(optionButtons.filter({ has: dialog.getByText(/FAQ Accordion/) })).toHaveCount(1);
    await expect(optionButtons.filter({ has: dialog.getByText(/^Destinations$/) })).toHaveCount(0);
  });

  test('category tab restricts the visible set', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);
    await editor.openAddSection();

    const dialog = page.getByRole('dialog');
    const optionButtons = dialog.locator('div.grid.grid-cols-2 > button');
    await dialog.locator('.studio-tabs').getByRole('button', { name: 'Hero', exact: true }).click();

    await expect(optionButtons.filter({ has: dialog.getByText(/^Hero$/) })).toHaveCount(1);
    await expect(optionButtons.filter({ has: dialog.getByText(/^Hero with Image$/) })).toHaveCount(1);
    await expect(optionButtons.filter({ has: dialog.getByText(/^FAQ$/) })).toHaveCount(0);
  });
});
