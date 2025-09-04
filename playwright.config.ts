import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // keep Playwright test artifacts separate from HTML report output
  outputDir: 'playwright-results',
  testDir: 'tests',
  timeout: 30_000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  retries: 0,
  // Place HTML report outside the Playwright test-results folder to avoid
  // Playwright clearing artifacts during report generation.
  reporter: [['list'], ['html', { outputFolder: 'playwright-report' }]],
  use: {
  headless: true,
  viewport: { width: 1280, height: 800 },
  ignoreHTTPSErrors: true,
  actionTimeout: 5000,
  // increase default timeout for locator actions to avoid transient failures
  navigationTimeout: 30_000,
  },
  webServer: {
    // pass explicit port to dev server so playwright can reliably check
    command: 'npm run dev -- --port 3000',
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
