import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  outputDir: './test-results/artifacts',
  reporter: [['html', { outputFolder: 'test-results/report', open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Use Playwright's bundled Chromium (no dependency on system Google Chrome).
    // Install with: pnpm exec playwright install chromium
    // Chromium is the single maintained project: visual baselines exist only for
    // it, and CI installs only this browser. Adding firefox/webkit back is a
    // deliberate step — install the browser, regenerate per-project baselines,
    // and extend the CI e2e lane in the same change.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.CI
    ? {
        command: 'pnpm preview --port 5173 --strictPort',
        url: 'http://localhost:5173',
        reuseExistingServer: false,
      }
    : {
        command: 'pnpm dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
      },
});
