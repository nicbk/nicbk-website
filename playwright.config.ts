import { defineConfig, devices } from '@playwright/test'
import { placeholderEnv } from './scripts/placeholder-env.mjs'

// biome-ignore lint/complexity/useLiteralKeys: tsconfig's noPropertyAccessFromIndexSignature requires bracket access on process.env
const isCi = process.env['CI'] === 'true'

// E2e suite (e2e/*.spec.ts) — smoke coverage of the app shell. Locally it
// runs against the dev server (fast iteration); in CI it runs against the
// built production server so the real serving path is what's exercised.
//
// The two are NOT interchangeable, and a plain `npm run test:e2e` will report
// a handful of failures that are not bugs. The dev server deliberately serves
// draft posts for local preview (`import.meta.env.PROD` gates the exclusion —
// see blog/-lib/load-listing.ts), so every assertion about how many posts the
// list contains is written against the production set and cannot hold in dev.
// Dev also hydrates far more slowly, widening the pre-hydration window that
// `toggleTagTo`/`searchPostsFor` (e2e/fixtures.ts) exist to absorb.
//
// Use `npm run test:e2e:prod` (this config with CI=true) to reproduce what CI
// actually gates on. `npm run test:e2e` stays the fast loop for iterating on a
// single test.
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
    // Enables the test-only /error-probe throw (src/routes/error-probe.tsx)
    // for the error-fallback e2e. Vite inlines this at build/dev start, so it
    // is set only here — production builds never carry it and the probe stays
    // inert (renders the normal 404 instead of throwing).
    env: {
      VITE_E2E_ERROR_PROBE: '1',
      // The server validates its whole environment at startup (src/env.ts) and
      // throws on anything missing. Nothing in this suite signs in, touches the
      // database, or uploads — those all need a session, which is the auth
      // tier's job, and that tier brings real Postgres, zero-cache, and Garage
      // containers instead of these. So the shared placeholders are enough;
      // they live in one place because keeping a copy here drifted from the
      // schema twice, each time failing the whole suite on a server that
      // refused to boot. See scripts/placeholder-env.mjs.
      ...placeholderEnv,
      // Inlined into the client bundle at build time, so it has to be set for
      // the build this command runs — not just for the server it then starts.
      // No zero-cache runs in this tier and nothing in it reaches /lit-tracker
      // (that needs a session, which is the auth tier's job), so this only has
      // to be a well-formed address.
      VITE_ZERO_CACHE_URL: 'http://localhost:4848',
    },
    port: 3000,
    reuseExistingServer: !isCi,
    // Generous in CI: the command above includes a full production build.
    timeout: 180_000,
  },
})
