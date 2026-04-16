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

export default defineConfig({
  testDir: './e2e/tests',
  globalSetup: './e2e/global-setup.ts',
  outputDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: reportFolder, open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
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
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
      },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
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
