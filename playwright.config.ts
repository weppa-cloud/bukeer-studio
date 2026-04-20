import { defineConfig, devices } from '@playwright/test';
import { config as dotenvConfig } from 'dotenv';

// Load .env.local for E2E env vars (E2E_WEBSITE_ID, E2E_USER_EMAIL, etc.)
dotenvConfig({ path: '.env.local' });

const sessionName = process.env.E2E_SESSION_NAME || 'default';
const reportFolder = `playwright-report/${sessionName}`;
const outputDir = `test-results/${sessionName}`;
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const webServerCommand = process.env.E2E_WEBSERVER_CMD || 'npm run dev:node';
const chromiumWebglArgs = [
  '--ignore-gpu-blocklist',
  '--use-angle=swiftshader-webgl',
  '--enable-unsafe-swiftshader',
];

// AC8 (Recovery Gate #226): Firefox is BLOCKING. Viewport flakes get a
// narrow retry budget (1 extra attempt per test). Real regressions still
// fail. Infra outages are classified via e2e/setup/infra-classifier.ts.
const ciRetries = process.env.CI ? 2 : 0;
const firefoxRetries = Number(process.env.PW_FIREFOX_RETRIES ?? ciRetries);
const viewportFlakeRetries = Number(process.env.PW_VIEWPORT_FLAKE_RETRIES ?? 1);

export default defineConfig({
  testDir: './e2e/tests',
  globalSetup: './e2e/global-setup.ts',
  outputDir,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: ciRetries,
  workers: 1,
  reporter: [
    ['html', { outputFolder: reportFolder, open: 'never' }],
    ['list'],
    ['json', { outputFile: `${outputDir}/results.json` }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: chromiumWebglArgs,
        },
      },
      dependencies: ['setup'],
    },
    {
      // #226 AC8 — Firefox BLOCKING (same matrix as chromium).
      // viewport_flake retries ensure narrow layout-sensitivity isn't
      // counted as a real regression. See e2e/setup/infra-classifier.ts.
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
      retries: Math.max(firefoxRetries, viewportFlakeRetries),
      dependencies: ['setup'],
    },
    {
      // #226 AC9 — mobile-chrome runs render/public/settings/domain specs.
      // Desktop-only flows (DnD + section canvas) skip via
      // `test.skip(({ isMobile }) => isMobile, 'desktop-only editor')`.
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          args: chromiumWebglArgs,
        },
      },
      dependencies: ['setup'],
    },
    {
      // EPIC #214 W4 #218 — Pilot editor→render suite scoped to
      // `e2e/tests/pilot/editor-render/`. Tagged `@pilot-w4` so
      // `--project=pilot --grep "@pilot-w4"` resolves the full W4
      // surface without pulling the rest of the regression matrix.
      // Coexists with chromium/firefox/mobile-chrome — run those
      // explicitly for full-matrix coverage (per Gate 2 instruction).
      name: 'pilot',
      testDir: './e2e/tests/pilot',
      grep: /@pilot-w4/,
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: chromiumWebglArgs,
        },
      },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: webServerCommand,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
