#!/usr/bin/env node

import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const protectedRoute = '/admin/products';
const outputDir =
  process.env.ADMIN_NEXT_PRODUCTS_READONLY_SMOKE_OUTPUT_DIR ||
  'output/playwright/admin-next/products-readonly';
const buildIdPath = path.join(process.cwd(), '.next', 'BUILD_ID');

let sessionName = null;
let server = null;

async function main() {
  hydrateLocalEnv();

  if (!existsSync(buildIdPath)) {
    throw new Error(
      'Missing .next production build. Run `npm run build -- --no-lint` before products readonly smoke.',
    );
  }

  mkdirSync(outputDir, { recursive: true });

  const readonlyContext = await resolveReadonlyContext();
  if (readonlyContext.expectedProductCount <= 0) {
    throw new Error(
      'Readonly Products smoke requires at least one active V2 catalog row for the E2E account.',
    );
  }

  const baseUrl = await startLocalServer(readonlyContext);
  await waitForHttp(new URL('/login', baseUrl).toString());

  const result = await runReadonlyProductsSmoke({
    baseUrl,
    email: readonlyContext.email,
    password: readonlyContext.password,
    expectedProductCount: readonlyContext.expectedProductCount,
    expectedActiveProductCount: readonlyContext.expectedActiveProductCount,
    expectedSelectedRateCount: readonlyContext.expectedSelectedRateCount,
    expectedSelectedGalleryCount:
      readonlyContext.expectedSelectedGalleryCount,
    expectedSelectedGallerySource:
      readonlyContext.expectedSelectedGallerySource,
    firstExpectedProductId: readonlyContext.firstExpectedProductId,
    expectedHotelCount: readonlyContext.expectedHotelCount,
    expectedActivityCount: readonlyContext.expectedActivityCount,
    role: readonlyContext.role,
  });

  console.log(JSON.stringify(result, null, 2));
}

function hydrateLocalEnv() {
  for (const file of ['.env.local', '.dev.vars']) {
    const absolutePath = path.join(process.cwd(), file);
    if (!existsSync(absolutePath)) continue;

    const content = readFileSync(absolutePath, 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match) continue;

      const [, key, rawValue] = match;
      if (process.env[key]) continue;

      process.env[key] = stripEnvQuotes(rawValue);
    }
  }
}

function stripEnvQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function requireEnv(key) {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required env key ${key}.`);
  }

  return value;
}

async function resolveReadonlyContext() {
  const supabase = createClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
  const email = requireEnv('E2E_USER_EMAIL');
  const password = requireEnv('E2E_USER_PASSWORD');
  const { data: auth, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError || !auth.user) {
    throw new Error(
      `Could not authenticate E2E user: ${signInError?.message ?? 'missing user'}`,
    );
  }

  const { data: roleRows, error: roleError } = await supabase
    .from('user_roles')
    .select('account_id, roles(role_name)')
    .eq('user_id', auth.user.id)
    .eq('is_active', true)
    .limit(10);

  if (roleError) {
    throw new Error(`Could not read E2E account role: ${roleError.message}`);
  }

  const roleRow = roleRows?.find((row) => !!row.account_id);
  const accountId = roleRow?.account_id;
  const role = extractRoleName(roleRow?.roles);

  if (!accountId || !role) {
    throw new Error(
      'E2E user does not have an active account role for Admin Next readonly smoke.',
    );
  }

  const [hotelsResponse, activitiesResponse] = await Promise.all([
    supabase
      .from('account_hotels')
      .select(
        'id, master_hotels(photos), account_rates(id, price, is_active)',
      )
      .eq('account_id', accountId)
      .eq('is_active', true)
      .limit(25),
    supabase
      .from('account_activities')
      .select(
        'id, master_activities(photos), activity_options(id, is_active, activity_prices(id, price, is_active))',
      )
      .eq('account_id', accountId)
      .eq('is_active', true)
      .limit(25),
  ]);

  if (hotelsResponse.error) {
    throw new Error(
      `Could not read account_hotels: ${hotelsResponse.error.message}`,
    );
  }
  if (activitiesResponse.error) {
    throw new Error(
      `Could not read account_activities: ${activitiesResponse.error.message}`,
    );
  }
  const hotelRows = hotelsResponse.data ?? [];
  const activityRows = activitiesResponse.data ?? [];
  const productIds = [...hotelRows, ...activityRows].map((row) => row.id);
  const imagesResponse =
    productIds.length > 0
      ? await supabase
          .from('images')
          .select('id, entity_id, url, order_index, created_at')
          .eq('account_id', accountId)
          .in('entity_id', productIds)
          .limit(5000)
      : { data: [], error: null };
  if (imagesResponse.error) {
    throw new Error(`Could not read images: ${imagesResponse.error.message}`);
  }
  const imageOverrideMap = groupImageOverridesByEntity(
    imagesResponse.data ?? [],
  );
  const expectedActiveHotelCount = hotelRows.filter(hasActiveHotelRate).length;
  const expectedActiveActivityCount = activityRows.filter(
    hasActiveActivityPrice,
  ).length;
  const pricedHotelWithGalleryRow = hotelRows.find(
    (row) =>
      countActiveHotelRates(row) > 0 &&
      countHotelPhotos(row, imageOverrideMap) > 0,
  );
  const pricedActivityWithGalleryRow = activityRows.find(
    (row) =>
      countActiveActivityPrices(row) > 0 &&
      countActivityPhotos(row, imageOverrideMap) > 0,
  );
  const pricedHotelRow = hotelRows.find(
    (row) => countActiveHotelRates(row) > 0,
  );
  const pricedActivityRow = activityRows.find(
    (row) => countActiveActivityPrices(row) > 0,
  );
  const selectedReadonlyRow =
    pricedHotelWithGalleryRow ??
    pricedActivityWithGalleryRow ??
    pricedHotelRow ??
    pricedActivityRow ??
    hotelRows[0] ??
    activityRows[0];
  const selectedReadonlyRowIsHotel = Boolean(
    selectedReadonlyRow && 'account_rates' in selectedReadonlyRow,
  );
  const expectedSelectedRateCount = Math.min(
    selectedReadonlyRowIsHotel
      ? countActiveHotelRates(selectedReadonlyRow)
      : countActiveActivityPrices(selectedReadonlyRow),
    6,
  );
  const selectedOverrideRows = selectedReadonlyRow
    ? (imageOverrideMap.get(selectedReadonlyRow.id) ?? [])
    : [];
  const selectedGalleryRows = !selectedReadonlyRow
    ? []
    : selectedOverrideRows.length > 0
      ? selectedOverrideRows
      : selectedReadonlyRowIsHotel
        ? extractPhotoUrls(firstRelation(selectedReadonlyRow.master_hotels)?.photos)
        : extractPhotoUrls(
            firstRelation(selectedReadonlyRow.master_activities)?.photos,
          );
  const expectedSelectedGalleryCount = Math.min(
    new Set(selectedGalleryRows).size,
    5,
  );
  const expectedSelectedGallerySource =
    expectedSelectedGalleryCount === 0
      ? null
      : selectedOverrideRows.length > 0
        ? 'override'
        : 'master';

  return {
    email,
    password,
    accountId,
    role,
    expectedHotelCount: hotelRows.length,
    expectedActivityCount: activityRows.length,
    expectedProductCount: hotelRows.length + activityRows.length,
    expectedActiveProductCount:
      expectedActiveHotelCount + expectedActiveActivityCount,
    expectedSelectedRateCount,
    expectedSelectedGalleryCount,
    expectedSelectedGallerySource,
    firstExpectedProductId: hotelRows[0]?.id ?? activityRows[0]?.id ?? null,
  };
}

function firstRelation(value) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function extractPhotoUrls(value) {
  if (Array.isArray(value)) return value.flatMap(extractPhotoUrlFromItem);

  if (value && typeof value === 'object') {
    for (const key of ['images', 'photos', 'gallery']) {
      if (Array.isArray(value[key])) {
        return value[key].flatMap(extractPhotoUrlFromItem);
      }
    }
  }

  return [];
}

function extractPhotoUrlFromItem(value) {
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? [normalized] : [];
  }

  if (value && typeof value === 'object') {
    const url = typeof value.url === 'string' ? value.url.trim() : '';
    const thumbnail =
      typeof value.thumbnail === 'string' ? value.thumbnail.trim() : '';
    const src = typeof value.src === 'string' ? value.src.trim() : '';
    const resolved = url || thumbnail || src;
    return resolved ? [resolved] : [];
  }

  return [];
}

function hasActiveHotelRate(row) {
  return countActiveHotelRates(row) > 0;
}

function hasActiveActivityPrice(row) {
  return countActiveActivityPrices(row) > 0;
}

function countActiveHotelRates(row) {
  return Array.isArray(row?.account_rates)
    ? row.account_rates.filter((rate) => isActivePricedRow(rate)).length
    : 0;
}

function countActiveActivityPrices(row) {
  if (!Array.isArray(row?.activity_options)) return 0;

  return row.activity_options
    .filter((option) => option?.is_active !== false)
    .flatMap((option) =>
      Array.isArray(option.activity_prices)
        ? option.activity_prices.filter((price) => isActivePricedRow(price))
        : [],
    ).length;
}

function groupImageOverridesByEntity(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const entityId = typeof row?.entity_id === 'string' ? row.entity_id : '';
    const url = typeof row?.url === 'string' ? row.url.trim() : '';
    if (!entityId || !url) continue;

    grouped.set(entityId, [...(grouped.get(entityId) ?? []), row]);
  }

  return new Map(
    Array.from(grouped.entries()).map(([entityId, entityRows]) => [
      entityId,
      uniqueStrings(
        entityRows
          .slice()
          .sort(compareImageOverrideRows)
          .map((row) => row.url?.trim())
          .filter(Boolean),
      ),
    ]),
  );
}

function uniqueStrings(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function compareImageOverrideRows(left, right) {
  return (
    compareNullableNumbers(readNullableNumber(left?.order_index), readNullableNumber(right?.order_index)) ||
    String(left?.created_at ?? '').localeCompare(String(right?.created_at ?? '')) ||
    String(left?.id ?? '').localeCompare(String(right?.id ?? ''))
  );
}

function compareNullableNumbers(left, right) {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;

  return left - right;
}

function countHotelPhotos(row, imageOverrideMap) {
  const overrideRows = imageOverrideMap.get(row?.id) ?? [];
  if (overrideRows.length > 0) return overrideRows.length;

  return extractPhotoUrls(firstRelation(row?.master_hotels)?.photos).length;
}

function countActivityPhotos(row, imageOverrideMap) {
  const overrideRows = imageOverrideMap.get(row?.id) ?? [];
  if (overrideRows.length > 0) return overrideRows.length;

  return extractPhotoUrls(firstRelation(row?.master_activities)?.photos).length;
}

function isActivePricedRow(row) {
  return row?.is_active !== false && readNumber(row?.price) > 0;
}

function readNumber(value) {
  return readNullableNumber(value) ?? 0;
}

function readNullableNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.trim().replaceAll(',', ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function extractRoleName(roleValue) {
  if (!roleValue) return null;
  if (Array.isArray(roleValue)) return roleValue[0]?.role_name ?? null;
  return roleValue.role_name ?? null;
}

async function startLocalServer(readonlyContext) {
  const session = acquireSession();
  sessionName = session.SESSION_NAME;
  const port = session.PORT;

  server = spawn('npm', ['start'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ADMIN_NEXT_PROTOTYPE_ENABLED: 'true',
      ADMIN_NEXT_DATA_SOURCE_MODE: 'readonly',
      ADMIN_NEXT_BETA_READONLY_ENABLED: 'true',
      ADMIN_NEXT_BETA_ACCOUNT_IDS: readonlyContext.accountId,
      ADMIN_NEXT_BETA_ROLES: readonlyContext.role,
      PORT: port,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (chunk) => {
    process.stdout.write(`[next-products-readonly:${sessionName}] ${chunk}`);
  });
  server.stderr.on('data', (chunk) => {
    process.stderr.write(`[next-products-readonly:${sessionName}] ${chunk}`);
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
      if (response.ok || response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for ${url}: ${lastError?.message}`);
}

async function runReadonlyProductsSmoke({
  baseUrl,
  email,
  password,
  expectedProductCount,
  expectedActiveProductCount,
  expectedSelectedRateCount,
  expectedSelectedGalleryCount,
  expectedSelectedGallerySource,
  firstExpectedProductId,
  expectedHotelCount,
  expectedActivityCount,
  role,
}) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  const consoleMessages = [];
  const pageErrors = [];

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
    const protectedUrl = new URL(protectedRoute, baseUrl).toString();
    await page.goto(protectedUrl, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });

    if (!page.url().includes('/login')) {
      throw new Error(
        `Expected unauthenticated redirect to login, got ${page.url()}`,
      );
    }

    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();
    await page.waitForURL((url) => url.pathname === protectedRoute, {
      timeout: 30_000,
    });

    const root = page.locator('[data-testid="admin-next-products-root"]');
    await root.waitFor({ timeout: 20_000 });

    const preset = await root.getAttribute('data-theme-preset');
    const dataSourceMode = await root.getAttribute('data-source-mode');
    const title = await page.locator('h1').first().textContent();
    const productCount = await page
      .locator('[data-testid^="admin-next-product-card-"]')
      .count();
    const activeProductCount = await page
      .locator('[data-testid^="admin-next-product-card-"][data-rate-state="active"]')
      .count();
    const selectedRateCount = await page
      .locator('[data-testid^="admin-next-products-rate-menu-"]')
      .count();
    const selectedGalleryImageCount = await page
      .locator('[data-testid^="admin-next-products-gallery-image-"]')
      .count();
    const selectedGallerySource =
      selectedGalleryImageCount > 0
        ? await page
            .locator('[data-testid="admin-next-products-gallery-image-0"]')
            .getAttribute('data-gallery-source')
        : null;
    const firstExpectedProductVisible = firstExpectedProductId
      ? await page
          .locator(
            `[data-testid="admin-next-product-card-${firstExpectedProductId}"]`,
          )
          .isVisible()
      : false;
    const hasToolbar = await page
      .getByTestId('admin-next-products-toolbar')
      .isVisible();
    const hasDetail = await page
      .getByTestId('admin-next-products-detail')
      .isVisible();
    const hasAiPanel = await page
      .getByTestId('admin-next-products-ai-panel')
      .isVisible();
    const screenshot = path.join(
      outputDir,
      'products-readonly-evolucion-light.png',
    );
    await page.screenshot({ path: screenshot, fullPage: false });

    if (preset !== 'evolucion') {
      throw new Error(`Expected Evolucion preset, got ${preset}`);
    }
    if (dataSourceMode !== 'readonly') {
      throw new Error(
        `Expected readonly data source mode, got ${dataSourceMode}`,
      );
    }
    if (title?.trim() !== 'Productos') {
      throw new Error(`Unexpected products title: ${title}`);
    }
    if (productCount !== expectedProductCount) {
      throw new Error(
        `Expected ${expectedProductCount} readonly products, got ${productCount}`,
      );
    }
    if (activeProductCount !== expectedActiveProductCount) {
      throw new Error(
        `Expected ${expectedActiveProductCount} active readonly products, got ${activeProductCount}`,
      );
    }
    if (selectedRateCount !== expectedSelectedRateCount) {
      throw new Error(
        `Expected ${expectedSelectedRateCount} selected readonly rates, got ${selectedRateCount}`,
      );
    }
    if (selectedGalleryImageCount !== expectedSelectedGalleryCount) {
      throw new Error(
        `Expected ${expectedSelectedGalleryCount} selected readonly gallery images, got ${selectedGalleryImageCount}`,
      );
    }
    if (selectedGallerySource !== expectedSelectedGallerySource) {
      throw new Error(
        `Expected selected readonly gallery source ${expectedSelectedGallerySource}, got ${selectedGallerySource}`,
      );
    }
    if (!firstExpectedProductVisible) {
      throw new Error(
        'First readonly catalog row was not visible in Products UI.',
      );
    }
    if (!hasToolbar || !hasDetail || !hasAiPanel) {
      throw new Error('Readonly Products required surfaces are not visible.');
    }
    if (pageErrors.length > 0) {
      throw new Error(`Page errors detected:\n${pageErrors.join('\n')}`);
    }

    return {
      status: 'pass',
      url: protectedUrl,
      preset,
      dataSourceMode,
      title: title?.trim(),
      role,
      expectedHotelCount,
      expectedActivityCount,
      expectedProductCount,
      expectedActiveProductCount,
      expectedSelectedRateCount,
      expectedSelectedGalleryCount,
      expectedSelectedGallerySource,
      productCount,
      activeProductCount,
      selectedRateCount,
      selectedGalleryImageCount,
      selectedGallerySource,
      firstExpectedProductVisible,
      hasToolbar,
      hasDetail,
      hasAiPanel,
      consoleMessages,
      screenshot,
      credentialsPrinted: false,
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
      process.stderr.write(
        `Could not release session ${sessionName}: ${error.message}\n`,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(cleanup);
