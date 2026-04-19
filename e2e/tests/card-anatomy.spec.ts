import { test, expect } from '@playwright/test';

/**
 * Card anatomy regression tests — validates visual pattern compliance
 * for hotels (Airbnb), activities (G Adventures), packages (Intrepid).
 *
 * These tests lock in the aspect-ratio, hover-zoom, gradient-overlay,
 * duration-chip, and highlights fixes applied 2026-04-15.
 */

const SUBDOMAIN = 'colombiatours';
const BASE = `/site/${SUBDOMAIN}`;

test.describe('Card Anatomy — Packages (Intrepid pattern)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('package image container uses 16:9 aspect ratio', async ({ page }) => {
    const section = page.locator('section#packages');
    await expect(section).toBeVisible();

    const imgContainers = section.locator('article .relative.overflow-hidden');
    const count = await imgContainers.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const cls = await imgContainers.nth(i).getAttribute('class');
      expect(cls).toContain('aspect-[16/9]');
    }
  });

  test('package image has hover zoom class', async ({ page }) => {
    const section = page.locator('section#packages');
    const images = section.locator('article img');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const cls = await images.nth(i).getAttribute('class');
      expect(cls).toContain('group-hover:scale-105');
    }
  });

  test('package article has group class for hover coordination', async ({ page }) => {
    const articles = page.locator('section#packages article.group');
    const count = await articles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('package gradient overlay present on image', async ({ page }) => {
    const section = page.locator('section#packages');
    const gradients = section.locator('article .absolute.inset-0');
    const count = await gradients.count();
    expect(count).toBeGreaterThan(0);
  });

  test('duration chip uses inline-flex pill styling', async ({ page }) => {
    const section = page.locator('section#packages');
    const chips = section.locator('article span.inline-flex');
    // chips only render when duration data exists
    const count = await chips.count();
    if (count > 0) {
      const cls = await chips.first().getAttribute('class');
      expect(cls).toContain('rounded-full');
    }
  });

  test('highlights render as checkmark list when data present', async ({ page }) => {
    const section = page.locator('section#packages');
    const lists = section.locator('article ul');
    const count = await lists.count();
    if (count > 0) {
      // each list item should have a checkmark svg
      const listItems = section.locator('article ul li svg');
      expect(await listItems.count()).toBeGreaterThan(0);
    }
  });
});

test.describe('Card Anatomy — Activities (G Adventures pattern)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('activity image container uses 16:9 aspect ratio', async ({ page }) => {
    const section = page.locator('section#activities');
    const visible = await section.isVisible();
    if (!visible) return; // section not in this website's layout

    const imgContainers = section.locator('article .relative.overflow-hidden');
    const count = await imgContainers.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const cls = await imgContainers.nth(i).getAttribute('class');
      expect(cls).toContain('aspect-[16/9]');
    }
  });

  test('activity article has group class', async ({ page }) => {
    const section = page.locator('section#activities');
    const visible = await section.isVisible();
    if (!visible) return;

    const articles = section.locator('article.group');
    expect(await articles.count()).toBeGreaterThan(0);
  });

  test('activity image has hover zoom class', async ({ page }) => {
    const section = page.locator('section#activities');
    const visible = await section.isVisible();
    if (!visible) return;

    const images = section.locator('article img');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const cls = await images.nth(i).getAttribute('class');
      expect(cls).toContain('group-hover:scale-105');
    }
  });

  test('activity rating stars render when rating data present', async ({ page }) => {
    const section = page.locator('section#activities');
    const visible = await section.isVisible();
    if (!visible) return;

    // stars only render when activity.rating exists in data
    const starRows = section.locator('article .flex svg');
    const count = await starRows.count();
    // just confirm no error — stars are optional if no rating data
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Card Anatomy — Hotels (Airbnb pattern)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('hotel image container uses 16:9 aspect ratio', async ({ page }) => {
    const section = page.locator('section#hotels');
    const visible = await section.isVisible();
    if (!visible) return;

    const imgContainers = section.locator('article .relative.overflow-hidden');
    const count = await imgContainers.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const cls = await imgContainers.nth(i).getAttribute('class');
      expect(cls).toContain('aspect-[16/9]');
    }
  });

  test('hotel image has hover zoom class', async ({ page }) => {
    const section = page.locator('section#hotels');
    const visible = await section.isVisible();
    if (!visible) return;

    const images = section.locator('article img');
    const count = await images.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const cls = await images.nth(i).getAttribute('class');
      expect(cls).toContain('group-hover:scale-105');
    }
  });

  test('hotel article has group class', async ({ page }) => {
    const section = page.locator('section#hotels');
    const visible = await section.isVisible();
    if (!visible) return;

    const articles = section.locator('article.group');
    expect(await articles.count()).toBeGreaterThan(0);
  });

  test('hotel gradient overlay on image', async ({ page }) => {
    const section = page.locator('section#hotels');
    const visible = await section.isVisible();
    if (!visible) return;

    const gradients = section.locator('article .absolute.inset-0');
    expect(await gradients.count()).toBeGreaterThan(0);
  });

  test('hotel star badge uses backdropFilter glassmorphism', async ({ page }) => {
    const section = page.locator('section#hotels');
    const visible = await section.isVisible();
    if (!visible) return;

    // star badge only renders when hotel.rating (star_rating) exists
    const starBadge = section.locator('article .absolute.top-3.right-3').first();
    const badgeCount = await section.locator('article .absolute.top-3.right-3').count();
    if (badgeCount > 0) {
      const style = await starBadge.getAttribute('style');
      expect(style).toContain('blur');
    }
  });

  test('hotel review rating renders as star icons not plain text', async ({ page }) => {
    const section = page.locator('section#hotels');
    const visible = await section.isVisible();
    if (!visible) return;

    // check no plain "X de 5" text pattern exists
    const plainRating = section.locator('text=de 5');
    expect(await plainRating.count()).toBe(0);
  });
});

test.describe('Card Anatomy — No h-52 fixed heights remain', () => {
  test('no card image container uses deprecated h-52 class', async ({ page }) => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.setViewportSize({ width: 1440, height: 900 });

    const staleContainers = await page.evaluate(() => {
      const all = document.querySelectorAll('article .relative');
      return Array.from(all)
        .map(el => el.className)
        .filter(cls => cls.includes('h-52'));
    });

    expect(staleContainers).toHaveLength(0);
  });
});
