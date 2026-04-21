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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('Section picker — matrix', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });
  test.skip(({ isMobile }) => isMobile, 'Section picker validation is desktop-only.');

  test('all registered section labels appear in Add Section dialog', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    test.skip(
      !fixtures.pageId,
      `section-picker needs seeded page. Warnings: ${fixtures.warnings.join(' | ')}`,
    );
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);

    // Clear selection → open picker via right-panel "Add Section" CTA.
    await editor.openAddSection();

    const dialog = page.getByRole('dialog');
    const optionButton = (label: string) =>
      dialog.getByRole('button', {
        name: new RegExp(`^${escapeRegExp(label)}\\b`, 'i'),
      });
    await expect(dialog.getByRole('heading', { name: 'Add Section' })).toBeVisible({
      timeout: 15000,
    });

    // SECTION_LABELS covers the legacy label set; assert each rendered
    // label is present. Type-level testid (studio-picker-item-<type>) is
    // the contract used by other tests for exact lookups.
    for (const label of SECTION_LABELS) {
      await expect.poll(async () => optionButton(label).count(), { timeout: 10000 }).toBeGreaterThan(0);
    }
  });

  test('search filter narrows results to matching types', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    test.skip(
      !fixtures.pageId,
      `section-picker needs seeded page. Warnings: ${fixtures.warnings.join(' | ')}`,
    );
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);
    await editor.openAddSection();

    const dialog = page.getByRole('dialog');
    const optionButton = (label: string) =>
      dialog.getByRole('button', {
        name: new RegExp(`^${escapeRegExp(label)}\\b`, 'i'),
      });
    await dialog.getByPlaceholder('Search sections...').fill('faq');

    await expect.poll(async () => optionButton('FAQ').count()).toBeGreaterThan(0);
    await expect.poll(async () => optionButton('FAQ Accordion').count()).toBeGreaterThan(0);
    await expect(optionButton('Destinations')).toHaveCount(0);
  });

  test('category tab restricts the visible set', async ({ page }) => {
    const websiteId = await getFirstWebsiteId(page);
    const fixtures = await seedWave2Fixtures();
    test.skip(
      !fixtures.pageId,
      `section-picker needs seeded page. Warnings: ${fixtures.warnings.join(' | ')}`,
    );
    const editor = new PageEditorPom(page);
    await editor.goto(websiteId, fixtures.pageId!);
    await editor.openAddSection();

    const dialog = page.getByRole('dialog');
    const optionButton = (label: string) =>
      dialog.getByRole('button', {
        name: new RegExp(`^${escapeRegExp(label)}\\b`, 'i'),
      });
    await dialog.locator('.studio-tabs').getByRole('button', { name: 'Hero', exact: true }).click();

    await expect.poll(async () => optionButton('Hero').count()).toBeGreaterThan(0);
    await expect.poll(async () => optionButton('Hero with Image').count()).toBeGreaterThan(0);
    await expect(optionButton('FAQ')).toHaveCount(0);
  });
});
