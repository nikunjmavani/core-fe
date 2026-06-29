import { defineConfig, devices } from '@playwright/test';

/**
 * Cross-browser smoke against the production build (preview).
 * Does not require core-be — static shell + version-check UX only.
 *
 *   pnpm build && pnpm preview --port 4173 --strictPort
 *   pnpm test:cross-browser
 */
export default defineConfig({
  testDir: './tests/cross-browser',
  testMatch: /\.cross-browser\.test\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: './test-results/cross-browser/artifacts',
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
