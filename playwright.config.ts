import { defineConfig, devices } from '@playwright/test'

// E2e suite (e2e/*.spec.ts) — smoke coverage of the app shell against the
// real dev server. Runs locally via `npm run test:e2e`; wired into CI by
// the containerization-and-deployment task.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Trace on first retry — the decided primary debugging artifact for
  // containerized CI failures (research/testing-qa/e2e-testing.md).
  retries: 1,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
})
