import { defineConfig, devices } from '@playwright/test';

const EXTERNAL_BASE_URL = process.env.E2E_BASE_URL?.trim();
const LOCAL_BASE_URL = 'http://127.0.0.1:4173';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: EXTERNAL_BASE_URL || LOCAL_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
  },
  webServer: EXTERNAL_BASE_URL
    ? undefined
    : {
        command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
        url: LOCAL_BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    // Mobile is the launch gate: this is where most learner-facing regressions
    // have surfaced and it best matches the first external beta cohort.
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
