import { test, expect, type Page, type Locator } from '@playwright/test';

const SUBDOMAIN = process.env.E2E_PUBLIC_SUBDOMAIN || 'colombiatours';
const DESTINATIONS_LIST_URL = `/site/${SUBDOMAIN}/destinos`;
const DETAIL_SLUG_CANDIDATES = ['cartagena-de-indias', 'medellin', 'bogota', 'santa-marta'];

async function gotoWithRetries(page: Page, url: string, attempts = 3): Promise<void> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await page.goto(url, { waitUntil: 'commit', timeout: 90000 });
      return;
    } catch (error) {
      lastError = error;
      if (i === attempts - 1) break;
    }
  }
  throw lastError;
}

function nonDestinationMarkers(page: Page): Locator {
  return page.locator(
    'button[aria-label^="Hotel:"], button[aria-label^="Actividad:"], button[aria-label^="Servicio:"]'
  );
}

function destinationMarkers(page: Page): Locator {
  return page.locator('button[aria-label^="Destino:"]');
}

function fallbackMapFrame(page: Page): Locator {
  return page.locator('iframe[title="Mapa de ruta"]').first();
}

function compatibilityFallbackMap(page: Page): Locator {
  return page.locator('[data-testid="map-croquis-fallback"]').first();
}

async function gotoFirstDestinationDetail(page: Page): Promise<void> {
  for (const slug of DETAIL_SLUG_CANDIDATES) {
    await gotoWithRetries(page, `/site/${SUBDOMAIN}/destinos/${slug}`);
    const heading = page.getByRole('heading', { name: /Ubicacion/i });
    const hasMapHeading = await heading
      .waitFor({ state: 'visible', timeout: 45000 })
      .then(() => true)
      .catch(() => false);

    if (hasMapHeading) {
      await expect(page).toHaveURL(new RegExp(`/site/${SUBDOMAIN}/destinos/[^/]+$`));
      return;
    }
  }

  throw new Error('Could not find a destination detail page with map section');
}

test.describe('Maps — Destinations @maps', () => {
  test.describe.configure({ mode: 'serial' });
  test.setTimeout(150000);

  test('destinations listing renders map with main destination markers @maps', async ({ page }) => {
    await gotoWithRetries(page, DESTINATIONS_LIST_URL);
    await expect(page).toHaveURL(new RegExp(`/site/${SUBDOMAIN}/destinos$`));
    await expect(page.getByRole('heading', { name: /Destinos en Colombia/i })).toBeVisible();

    let resolvedState = 'pending';
    await expect
      .poll(
        async () => {
          const markerCount = await destinationMarkers(page).count();
          if (markerCount > 0) {
            resolvedState = 'markers';
            return resolvedState;
          }

          const compatibilityVisible = await compatibilityFallbackMap(page).isVisible().catch(() => false);
          if (compatibilityVisible) {
            resolvedState = 'compatibility';
            return resolvedState;
          }

          const legacyVisible = await fallbackMapFrame(page).isVisible().catch(() => false);
          if (legacyVisible) {
            resolvedState = 'legacy';
            return resolvedState;
          }

          resolvedState = 'pending';
          return resolvedState;
        },
        { timeout: 20000 }
      )
      .toMatch(/markers|compatibility|legacy/);

    expect(resolvedState).toMatch(/markers|compatibility|legacy/);
  });

  test('destination detail renders product/service markers with filters and simple popup @maps', async ({ page }) => {
    await gotoFirstDestinationDetail(page);

    const compatibilityVisible = await compatibilityFallbackMap(page).isVisible().catch(() => false);

    const productMarkers = nonDestinationMarkers(page);
    await expect
      .poll(async () => productMarkers.count(), { timeout: 20000 })
      .toBeGreaterThan(0);

    await expect(page.getByRole('button', { name: 'Todos' })).toBeVisible();
    await page.getByRole('heading', { name: /Ubicacion/i }).scrollIntoViewIfNeeded();

    await productMarkers.first().click({ force: true });
    const popup = compatibilityVisible
      ? page.locator('[data-testid="map-croquis-popup"]').first()
      : page.locator('.maplibregl-popup-content').first();
    await expect(popup).toBeVisible();
    await expect(popup.locator('p')).toHaveCount(2);

    const markerTypeText = (await popup.locator('p').nth(1).innerText()).trim();
    expect(['Destino', 'Hotel', 'Actividad', 'Servicio']).toContain(markerTypeText);
    await expect(popup.locator('img')).toHaveCount(0);
    await expect(popup.getByRole('link')).toHaveCount(0);
  });

  test('destination detail markers are visually distributed (no single-point overlap) @maps', async ({ page }) => {
    await gotoFirstDestinationDetail(page);

    const productMarkers = nonDestinationMarkers(page);
    const markerCount = await productMarkers.count();
    test.skip(markerCount < 2, 'Not enough markers to validate overlap behavior');

    const positions: string[] = [];
    const sampleSize = Math.min(markerCount, 12);
    for (let i = 0; i < sampleSize; i += 1) {
      const box = await productMarkers.nth(i).boundingBox();
      if (!box) continue;
      positions.push(`${Math.round(box.x)}:${Math.round(box.y)}`);
    }

    expect(positions.length).toBeGreaterThan(1);
    expect(new Set(positions).size).toBeGreaterThan(1);
  });

  test('degrades gracefully to legacy map when WebGL is unavailable @maps', async ({ page }) => {
    await page.addInitScript(() => {
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function getContext(
        this: HTMLCanvasElement,
        contextId: string,
        options?: CanvasRenderingContext2DSettings
      ) {
        if (contextId === 'webgl' || contextId === 'experimental-webgl') {
          return null;
        }
        return originalGetContext.call(this, contextId, options as never);
      };
    });

    await gotoWithRetries(page, DESTINATIONS_LIST_URL);
    await expect(page).toHaveURL(new RegExp(`/site/${SUBDOMAIN}/destinos$`));
    await expect(page.getByRole('heading', { name: /Destinos en Colombia/i })).toBeVisible();
    await expect
      .poll(async () => compatibilityFallbackMap(page).isVisible().catch(() => false), { timeout: 20000 })
      .toBe(true);
  });

  test('degrades gracefully when map style request fails @maps', async ({ page }) => {
    await page.route('**/*', async (route) => {
      const url = route.request().url();
      if (url.includes('style.json')) {
        await route.abort('failed');
        return;
      }
      await route.continue();
    });

    await gotoWithRetries(page, DESTINATIONS_LIST_URL);
    await expect(page).toHaveURL(new RegExp(`/site/${SUBDOMAIN}/destinos$`));
    await expect(page.getByRole('heading', { name: /Destinos en Colombia/i })).toBeVisible();

    let fallbackState = 'pending';
    await expect
      .poll(
        async () => {
          const legacyTitled = await page.locator('iframe[title="Mapa de ruta"]').first().isVisible().catch(() => false);
          if (legacyTitled) {
            fallbackState = 'legacy-titled';
            return fallbackState;
          }

          const legacyIframe = await page.locator('main iframe').first().isVisible().catch(() => false);
          if (legacyIframe) {
            fallbackState = 'legacy-iframe';
            return fallbackState;
          }

          const compatibility = await compatibilityFallbackMap(page).isVisible().catch(() => false);
          if (compatibility) {
            fallbackState = 'compatibility';
            return fallbackState;
          }

          fallbackState = 'pending';
          return fallbackState;
        },
        { timeout: 20000 }
      )
      .toMatch(/legacy-titled|legacy-iframe|compatibility/);

    expect(fallbackState).toMatch(/legacy-titled|legacy-iframe|compatibility/);
  });
});
