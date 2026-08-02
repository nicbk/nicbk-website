import { defineConfig, devices } from '@playwright/test'

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
      // The server validates its whole environment at startup and now
      // requires database and Google OAuth settings (src/env.ts). Nothing in
      // this suite signs in or touches the database yet — the auth surface
      // arrives with the sign-in page — so obvious placeholders are supplied
      // here rather than requiring a real .env (or a database) to run the e2e
      // suite. When a test does exercise sign-in, it brings its own real
      // Postgres and stubbed Google instead of these.
      DATABASE_URL: 'postgres://e2e:placeholder@localhost:5432/unused',
      BETTER_AUTH_SECRET: 'e2e-placeholder-secret-at-least-32-characters',
      BETTER_AUTH_URL: 'http://localhost:3000',
      GOOGLE_CLIENT_ID: 'e2e-placeholder-client-id',
      GOOGLE_CLIENT_SECRET: 'e2e-placeholder-client-secret',
      // Also required from startup on. Nothing in this suite is zero-cache, so
      // no request will ever present these — they only have to satisfy the
      // schema's minimum length.
      ZERO_QUERY_API_KEY: 'e2e-placeholder-zero-query-api-key-32-chars',
      ZERO_MUTATE_API_KEY: 'e2e-placeholder-zero-mutate-api-key-32-chars',
    },
    port: 3000,
    reuseExistingServer: !isCi,
    // Generous in CI: the command above includes a full production build.
    timeout: 180_000,
  },
})
