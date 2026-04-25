import { defineConfig, devices } from '@playwright/experimental-ct-react';
import { resolve } from 'node:path';

const sessionName = process.env.E2E_SESSION_NAME || 'ct';
const reportFolder = `playwright-report/${sessionName}-ct`;
const outputDir = `test-results/${sessionName}-ct`;

export default defineConfig({
  testDir: './__tests__/ct',
  snapshotDir: './__tests__/visual/studio-editor-baselines',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}-snapshots/{arg}-{projectName}-darwin{ext}',
  outputDir,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: reportFolder, open: 'never' }], ['list']],

  use: {
    trace: 'on-first-retry',
    ctPort: 3100,
    ctViteConfig: {
      resolve: {
        alias: {
          '@': resolve(__dirname, '.'),
          '@bukeer/theme-sdk': resolve(__dirname, 'packages/theme-sdk/src'),
          '@bukeer/website-contract': resolve(__dirname, 'packages/website-contract/src'),
        },
      },
    },
  },

  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
      animations: 'disabled',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
