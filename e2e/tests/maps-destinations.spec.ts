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

async function recoverFromRuntimeError(page: Page): Promise<void> {
  const errorHeading = page.getByRole('heading', { name: /Something went wrong/i });
  const hasError = await errorHeading.isVisible().catch(() => false);
  if (!hasError) return;

  const tryAgainButton = page.getByRole('button', { name: /Try again/i });
  if (await tryAgainButton.isVisible().catch(() => false)) {
    await tryAgainButton.click({ force: true });
  } else {
    await page.reload({ waitUntil: 'commit', timeout: 90000 });
  }
}

async function gotoListingPageReady(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await gotoWithRetries(page, DESTINATIONS_LIST_URL);
    await recoverFromRuntimeError(page);

    const heading = page.getByRole('heading', { name: /Destinos en Colombia/i });
    const ready = await heading
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false);

    if (ready) return;
  }

  throw new Error('Could not load destinations listing page in a ready state');
}

function nonDestinationMarkers(page: Page): Locator {
  return page.locator(
    'button[aria-label^="Hotel:"], button[aria-label^="Actividad:"], button[aria-label^="Servicio:"]'
  );
}

function destinationMarkers(page: Page): Locator {
  return page.locator('button[aria-label^="Destino:"]');
}

function compatibilityFallbackMap(page: Page): Locator {
  return page.locator('[data-testid="map-croquis-fallback"]').first();
}

async function gotoFirstDestinationDetail(page: Page): Promise<void> {
  for (const slug of DETAIL_SLUG_CANDIDATES) {
    await gotoWithRetries(page, `/site/${SUBDOMAIN}/destinos/${slug}`);
    await recoverFromRuntimeError(page);
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
    await gotoListingPageReady(page);
    await expect(page).toHaveURL(new RegExp(`/site/${SUBDOMAIN}/destinos$`));

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

          resolvedState = 'pending';
          return resolvedState;
        },
        { timeout: 20000 }
      )
      .toMatch(/markers|compatibility/);

    expect(resolvedState).toMatch(/markers|compatibility/);
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
    const popupCandidates = [
      page.locator('[data-testid="map-croquis-popup"]').first(),
      page.locator('.maplibregl-popup-content').first(),
    ];

    let popup: Locator | null = null;
    const attempts = Math.min(await productMarkers.count(), 4);
    for (let i = 0; i < attempts; i += 1) {
      await productMarkers.nth(i).click({ force: true });
      const popupIndex = await page
        .waitForFunction(
          () => {
            const croquis = Boolean(document.querySelector('[data-testid="map-croquis-popup"]'));
            const maplibre = Boolean(document.querySelector('.maplibregl-popup-content'));
            if (croquis) return 0;
            if (maplibre) return 1;
            return -1;
          },
          { timeout: 4000 }
        )
        .then((handle) => handle.jsonValue())
        .then((value) => (typeof value === 'number' ? value : -1))
        .catch(() => -1);

      if (popupIndex >= 0) {
        popup = popupCandidates[popupIndex];
        break;
      }
    }

    if (!popup) {
      popup = compatibilityVisible ? popupCandidates[0] : popupCandidates[1];
    }
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

    await gotoListingPageReady(page);
    await expect(page).toHaveURL(new RegExp(`/site/${SUBDOMAIN}/destinos$`));
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

    await gotoListingPageReady(page);
    await expect(page).toHaveURL(new RegExp(`/site/${SUBDOMAIN}/destinos$`));

    await expect
      .poll(async () => compatibilityFallbackMap(page).isVisible().catch(() => false), { timeout: 20000 })
      .toBe(true);
  });

  test('marker colors resolve from --chart-2 theme variable @maps', async ({ page }) => {
    await gotoFirstDestinationDetail(page);

    const hotelMarker = page.locator('button[aria-label^="Hotel:"]').first();
    const hotelVisible = await hotelMarker
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!hotelVisible, 'No hotel marker on this destination; chart-2 assertion cannot run');

    const themeChart2 = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--chart-2').trim()
    );
    expect(themeChart2).not.toBe('');

    const expectedRgb = await page.evaluate((chartValue) => {
      const prefixes = ['hsl(', 'oklch(', 'rgb(', 'rgba(', '#', 'lab(', 'lch(', 'color('];
      const hasPrefix = prefixes.some((p) => chartValue.startsWith(p));
      const probe = document.createElement('div');
      probe.style.color = hasPrefix ? chartValue : `hsl(${chartValue})`;
      document.body.appendChild(probe);
      const rgb = getComputedStyle(probe).color;
      probe.remove();
      return rgb;
    }, themeChart2);

    const markerBg = await hotelMarker.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(markerBg).toBe(expectedRgb);
  });

  test('map-less site routes do not ship maplibre-gl chunk @maps', async ({ page }) => {
    const mapLibreRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('maplibre')) mapLibreRequests.push(url);
    });

    await gotoWithRetries(page, `/site/${SUBDOMAIN}`);
    await recoverFromRuntimeError(page);
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => undefined);

    expect(mapLibreRequests, `Unexpected maplibre requests: ${mapLibreRequests.join(', ')}`).toHaveLength(0);
  });
});
