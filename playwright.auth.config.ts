import { defineConfig, devices } from '@playwright/test'

// biome-ignore lint/complexity/useLiteralKeys: tsconfig's noPropertyAccessFromIndexSignature requires bracket access on process.env
const isCi = process.env['CI'] === 'true'

/** Kept in step with AUTH_E2E_PORT in scripts/e2e-auth-server.mjs. */
const PORT = 3100

/**
 * The sign-in e2e tier: the OAuth round trip through a stubbed Google, against
 * a real Postgres.
 *
 * Separate from playwright.config.ts because it needs the opposite setup — a
 * database, migrations, a patched app server process, and Docker — none of
 * which the ordinary suite should have to pay for. The same split the
 * integration tier already has (vitest.integration.config.ts and its own CI
 * job), for the same reason.
 *
 * `/sign-in` as a page is covered by e2e/sign-in.spec.ts in the ordinary suite;
 * only the flow lives here.
 */
export default defineConfig({
  testDir: './e2e-auth',
  fullyParallel: false,
  // One worker, not just one test at a time per file: every spec here signs in
  // as the same stubbed Google account against one shared database, and one of
  // them deletes it. Files running concurrently would be pulling the account
  // out from under each other.
  workers: 1,
  retries: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/e2e-auth-server.mjs',
    port: PORT,
    reuseExistingServer: !isCi,
    // Generous: pulling and starting a Postgres container, applying
    // migrations, and (in CI) a full production build all happen first.
    timeout: 300_000,
  },
})
