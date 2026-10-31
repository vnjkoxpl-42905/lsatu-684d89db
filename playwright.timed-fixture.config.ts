import { defineConfig, devices } from '@playwright/test';

// Synthetic timed-section fixture: no account, no backend. Run with
//   npx playwright test -c playwright.timed-fixture.config.ts
export default defineConfig({
  testDir: './e2e',
  testMatch: 'timed-lr-highlight.spec.ts',
  timeout: 40_000,
  use: { baseURL: 'http://127.0.0.1:8098', viewport: { width: 1280, height: 900 } },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome' } }],
  webServer: { command: 'npx vite --config e2e/rc-review-fixture/vite.config.ts', url: 'http://127.0.0.1:8098', reuseExistingServer: true, timeout: 120_000 },
});
