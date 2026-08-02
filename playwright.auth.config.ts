import { defineConfig, devices } from '@playwright/test'
import {
  AUTH_E2E_BASE_URL,
  AUTH_E2E_PORT,
} from './e2e-auth/support/services.mjs'

// biome-ignore lint/complexity/useLiteralKeys: tsconfig's noPropertyAccessFromIndexSignature requires bracket access on process.env
const isCi = process.env['CI'] === 'true'

/**
 * The signed-in e2e tier: everything that needs a real session against real
 * services — the OAuth round trip through a stubbed Google, the account modal
 * it unlocks, and the Lit Tracker, whose whole point is data arriving by sync.
 *
 * Separate from playwright.config.ts because it needs the opposite setup — a
 * database, migrations, a zero-cache, a patched app server process, and Docker
 * — none of which the ordinary suite should have to pay for. The same split the
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
  // out from under each other. It is also what makes this tier's fixed host
  // ports (support/services.mjs) safe.
  workers: 1,
  retries: 1,
  use: {
    baseURL: AUTH_E2E_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/e2e-auth-server.mjs',
    port: AUTH_E2E_PORT,
    reuseExistingServer: !isCi,
    // Generous: pulling and starting Postgres and zero-cache, applying
    // migrations, waiting for the first replication pass, and (in CI) a full
    // production build all happen first.
    timeout: 420_000,
  },
})
