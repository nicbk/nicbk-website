import { defineConfig, devices } from '@playwright/test'

// biome-ignore lint/complexity/useLiteralKeys: tsconfig's noPropertyAccessFromIndexSignature requires bracket access on process.env
const isCi = process.env['CI'] === 'true'

// E2e suite (e2e/*.spec.ts) — smoke coverage of the app shell. Locally it
// runs against the dev server (fast iteration); in CI it runs against the
// built production server so the real serving path is what's exercised.
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
    command: isCi ? 'npm run build && npm run start' : 'npm run dev',
    port: 3000,
    reuseExistingServer: !isCi,
    // Generous in CI: the command above includes a full production build.
    timeout: 180_000,
  },
})
