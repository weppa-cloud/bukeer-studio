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
    await expect(dialog.getByRole('heading', { name: 'Add Section' })).toBeVisible({
      timeout: 15000,
    });

    for (const label of SECTION_LABELS) {
      await expect(dialog.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first())
        .toBeVisible();
    }
  });

  test('search filter narrows results to matching types', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);
    await editor.openAddSection();

    const dialog = page.getByRole('dialog');
    await dialog.getByPlaceholder('Search sections...').fill('faq');

    await expect(dialog.getByRole('button', { name: /^FAQ$/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /FAQ Accordion/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /Destinations/ })).toBeHidden();
  });

  test('category tab restricts the visible set', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);
    await editor.openAddSection();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Hero', exact: true }).click();

    await expect(dialog.getByRole('button', { name: /^Hero$/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /^Hero with Image$/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /^FAQ$/ })).toBeHidden();
  });
});
