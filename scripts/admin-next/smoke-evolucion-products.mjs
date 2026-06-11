#!/usr/bin/env node

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const route = '/admin/products/smoke';
const externalBaseUrl = process.env.ADMIN_NEXT_PRODUCTS_SMOKE_BASE_URL;
const outputDir =
  process.env.ADMIN_NEXT_PRODUCTS_SMOKE_OUTPUT_DIR ||
  'output/playwright/admin-next/products';
const shouldStartServer = !externalBaseUrl;
const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');

let sessionName = null;
let port = null;
let server = null;

async function main() {
  if (shouldStartServer && !existsSync(buildIdPath)) {
    throw new Error(
      'Missing .next production build. Run `npm run build -- --no-lint` before products smoke.',
    );
  }

  mkdirSync(outputDir, { recursive: true });

  const baseUrl = externalBaseUrl || (await startLocalServer());
  const targetUrl = new URL(route, baseUrl).toString();
  await waitForHttp(targetUrl);

  const catalogResolverApiBoundary = await verifyCatalogResolverApiBoundary(baseUrl);
  const result = await runPlaywrightSmoke(targetUrl, catalogResolverApiBoundary);
  console.log(JSON.stringify(result, null, 2));
}

async function startLocalServer() {
  const session = acquireSession();
  sessionName = session.SESSION_NAME;
  port = session.PORT;

  server = spawn('npm', ['start'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ADMIN_NEXT_PROTOTYPE_ENABLED: 'true',
      ADMIN_NEXT_PROTOTYPE_SMOKE_ENABLED: 'true',
      ADMIN_NEXT_DATA_SOURCE_MODE: 'fixture',
      PORT: port,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (chunk) => {
    process.stdout.write(`[next-products:${sessionName}] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[next-products:${sessionName}] ${chunk}`);
  });

  return `http://localhost:${port}`;
}

function acquireSession() {
  const output = execFileSync('bash', ['scripts/session-acquire.sh'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const session = {};

  for (const line of output.split('\n')) {
    const match = line.match(/^export\s+([A-Z_]+)=(.+)$/);
    if (match) {
      session[match[1]] = match[2].trim();
    }
  }

  if (!session.SESSION_NAME || !session.PORT) {
    throw new Error(`Could not acquire a local session slot:\n${output}`);
  }

  return session;
}

async function waitForHttp(url) {
  const deadline = Date.now() + 30_000;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message}`);
}

async function verifyCatalogResolverApiBoundary(baseUrl) {
  const response = await fetch(new URL('/api/admin-next/products/catalog-resolver', baseUrl), {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      rows: [{ id: 'smoke-row-1', sourceName: 'Hotel Las Islas' }],
    }),
  });
  const body = await response.json().catch(() => null);
  const code = body?.error?.code ?? null;

  if (response.status !== 401 || code !== 'UNAUTHORIZED') {
    throw new Error(`Products catalog resolver API boundary failed: HTTP ${response.status} ${code}`);
  }

  return {
    status: response.status,
    code,
  };
}

async function runPlaywrightSmoke(targetUrl, catalogResolverApiBoundary) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
    const response = await page.goto(targetUrl, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    const root = page.locator('[data-testid="admin-next-products-root"]');
    await root.waitFor({ timeout: 20_000 });

    const preset = await root.getAttribute('data-theme-preset');
    const title = await page.locator('h1').first().textContent();
    const productCount = await page.locator('[data-testid^="admin-next-product-card-"]').count();
    const hasToolbar = await page.getByTestId('admin-next-products-toolbar').isVisible();
    const hasDetail = await page.getByTestId('admin-next-products-detail').isVisible();
    const hasGallery = await page.getByTestId('admin-next-products-gallery').isVisible();
    const hasRates = await page.getByTestId('admin-next-products-rates').isVisible();
    const hasAiPanel = await page.getByTestId('admin-next-products-ai-panel').isVisible();
    const hasCatalogContract = await page.getByTestId('admin-next-products-catalog-contract').isVisible();
    const screenshot = path.join(outputDir, 'products-evolucion-light.png');
    await page.screenshot({ path: screenshot, fullPage: false });
    await page.getByTestId('admin-next-products-search-input').fill('traslado');
    await page.getByTestId('admin-next-products-city-option-cartagena').click();
    await page.getByTestId('admin-next-products-provider-option-marsol').click();
    await page.getByTestId('admin-next-products-tariff-option-review').click();
    await page.getByTestId('admin-next-products-price-option-budget').click();
    const filteredProductCount = await page.locator('[data-testid^="admin-next-product-card-"]').count();
    const filterUrl = new URL(page.url());
    const hasFilterQuery =
      filterUrl.searchParams.get('q') === 'traslado' &&
      filterUrl.searchParams.get('city') === 'cartagena' &&
      filterUrl.searchParams.get('provider') === 'marsol' &&
      filterUrl.searchParams.get('tariff') === 'review' &&
      filterUrl.searchParams.get('price') === 'budget';
    const filtersScreenshot = path.join(outputDir, 'products-filters-evolucion-light.png');
    await page.screenshot({ path: filtersScreenshot, fullPage: false });
    await page.getByTestId('admin-next-products-clear-filters').click();
    const clearedUrl = new URL(page.url());
    const filtersCleared = ['q', 'city', 'provider', 'tariff', 'price'].every(
      (key) => !clearedUrl.searchParams.has(key),
    );

    await page.getByTestId('admin-next-products-import').click();
    await page.getByTestId('admin-next-products-import-csv-modal').waitFor({ timeout: 10_000 });
    const hasImportCsvModal = await page.getByTestId('admin-next-products-import-csv-modal').isVisible();
    const hasImportDropzone = await page.getByTestId('admin-next-products-import-dropzone').isVisible();
    const importStepCount = await page.locator('[data-testid^="admin-next-products-import-step-"]').count();
    const importPreviewRowCount = await page.locator('[data-testid^="admin-next-products-import-row-"]').count();
    const hasCatalogResolver = await page.getByTestId('admin-next-products-catalog-resolver').isVisible();
    const catalogResolutionCount = await page.locator('[data-testid^="admin-next-products-catalog-resolution-"]').count();
    const importCsvScreenshot = path.join(outputDir, 'products-import-csv-modal-evolucion-light.png');
    await page.screenshot({ path: importCsvScreenshot, fullPage: false });
    await page.getByTestId('admin-next-products-modal-close').click();

    await page.getByTestId('admin-next-products-new').click();
    await page.getByTestId('admin-next-products-new-product-modal').waitFor({ timeout: 10_000 });
    const hasNewProductModal = await page.getByTestId('admin-next-products-new-product-modal').isVisible();
    await page.getByTestId('admin-next-products-modal-continue').click();
    await page.getByTestId('admin-next-products-new-hotel-modal').waitFor({ timeout: 10_000 });
    const hasNewHotelModal = await page.getByTestId('admin-next-products-new-hotel-modal').isVisible();
    await page.getByTestId('admin-next-products-modal-finish-hotel').click();
    await page.getByTestId('admin-next-products-new-rate-modal').waitFor({ timeout: 10_000 });
    const hasNewRateModal = await page.getByTestId('admin-next-products-new-rate-modal').isVisible();
    const rateModalScreenshot = path.join(outputDir, 'products-rate-modal-evolucion-light.png');
    await page.screenshot({ path: rateModalScreenshot, fullPage: false });
    await page.getByTestId('admin-next-products-modal-close').click();

    await page.getByTestId('admin-next-products-edit').click();
    await page.getByTestId('admin-next-products-edit-modal').waitFor({ timeout: 10_000 });
    const hasEditModal = await page.getByTestId('admin-next-products-edit-modal').isVisible();
    await page.getByTestId('admin-next-products-modal-close').click();

    await page.getByTestId('admin-next-products-manage-images').click();
    await page.getByTestId('admin-next-products-gallery-modal').waitFor({ timeout: 10_000 });
    const hasGalleryModal = await page.getByTestId('admin-next-products-gallery-modal').isVisible();
    const galleryTileCount = await page.locator('[data-testid^="admin-next-products-gallery-tile-"]').count();
    const galleryModalScreenshot = path.join(outputDir, 'products-gallery-modal-evolucion-light.png');
    await page.screenshot({ path: galleryModalScreenshot, fullPage: false });

    if (preset !== 'evolucion') {
      throw new Error(`Expected Evolucion preset, got ${preset}`);
    }
    if (title?.trim() !== 'Productos') {
      throw new Error(`Unexpected products title: ${title}`);
    }
    if (productCount < 3 || !hasToolbar || !hasDetail || !hasGallery || !hasRates || !hasAiPanel || !hasCatalogContract) {
      throw new Error('Products required surfaces are not visible.');
    }
    if (filteredProductCount !== 1 || !hasFilterQuery || !filtersCleared) {
      throw new Error('Products URL-as-state filters are not working.');
    }
    if (
      !hasImportCsvModal ||
      !hasImportDropzone ||
      !hasCatalogResolver ||
      importStepCount !== 3 ||
      importPreviewRowCount < 3 ||
      catalogResolutionCount < 3 ||
      !hasNewProductModal ||
      !hasNewHotelModal ||
      !hasNewRateModal ||
      !hasEditModal ||
      !hasGalleryModal ||
      galleryTileCount < 6
    ) {
      throw new Error('Products modal flows are not fully reachable.');
    }
    if (pageErrors.length > 0) {
      throw new Error(`Page errors detected:\n${pageErrors.join('\n')}`);
    }

    return {
      status: response?.status() ?? null,
      url: targetUrl,
      preset,
      title: title?.trim(),
      productCount,
      hasToolbar,
      hasDetail,
      hasGallery,
      hasRates,
      hasAiPanel,
      hasCatalogContract,
      filteredProductCount,
      hasFilterQuery,
      filtersCleared,
      hasImportCsvModal,
      hasImportDropzone,
      hasCatalogResolver,
      importStepCount,
      importPreviewRowCount,
      catalogResolutionCount,
      catalogResolverApiBoundary,
      hasNewProductModal,
      hasNewHotelModal,
      hasNewRateModal,
      hasEditModal,
      hasGalleryModal,
      galleryTileCount,
      consoleMessages,
      screenshots: [screenshot, filtersScreenshot, importCsvScreenshot, rateModalScreenshot, galleryModalScreenshot],
    };
  } finally {
    await browser.close();
  }
}

async function cleanup() {
  if (server && !server.killed) {
    server.kill('SIGTERM');
  }
  if (sessionName) {
    try {
      execFileSync('bash', ['scripts/session-release.sh', sessionName], {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
    } catch (error) {
      process.stderr.write(`Could not release session ${sessionName}: ${error.message}\n`);
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(cleanup);
