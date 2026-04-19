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

test.describe('Section picker — matrix @p0-editor', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.skip(({ isMobile }) => !!isMobile, 'desktop-only editor');

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

    const dialog = page.getByTestId('studio-picker-dialog');
    await expect(dialog).toBeVisible({ timeout: 15000 });

    // SECTION_LABELS covers the legacy label set; assert each rendered
    // label is present. Type-level testid (studio-picker-item-<type>) is
    // the contract used by other tests for exact lookups.
    for (const label of SECTION_LABELS) {
      await expect(dialog.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test('search filter narrows results to matching types', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);
    await editor.openAddSection();

    const dialog = page.getByTestId('studio-picker-dialog');
    await dialog.getByTestId('studio-picker-search').fill('faq');

    await expect(dialog.getByTestId('studio-picker-item-faq')).toBeVisible();
    await expect(dialog.getByTestId('studio-picker-item-faq_accordion')).toBeVisible();
    await expect(dialog.getByTestId('studio-picker-item-destinations')).toBeHidden();
  });

  test('category tab restricts the visible set', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);
    await editor.openAddSection();

    const dialog = page.getByTestId('studio-picker-dialog');
    await dialog.getByTestId('studio-picker-category-tab-hero').click();

    await expect(dialog.getByTestId('studio-picker-item-hero')).toBeVisible();
    await expect(dialog.getByTestId('studio-picker-item-hero_image')).toBeVisible();
    await expect(dialog.getByTestId('studio-picker-item-faq')).toBeHidden();
  });
});
