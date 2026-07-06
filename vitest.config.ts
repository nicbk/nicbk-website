import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts: unit tests don't need (or want) the
// full TanStack Start plugin pipeline — they run against plain modules and
// components in jsdom.
export default defineConfig({
  resolve: {
    alias: {
      // Mirrors the `~/` → ./src alias from tsconfig.json `paths`.
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Unit tests only — Playwright owns e2e/*.spec.ts (its default
    // include pattern would otherwise pick those up too).
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      // Unit-test coverage only, gated ratchet-style in CI: a PR fails if
      // its total line coverage drops below the last main-branch baseline
      // (scripts/coverage-ratchet.mjs). See
      // research/testing-qa/test-coverage-and-ci-gating.md.
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/routeTree.gen.ts'],
      // json-summary feeds the ratchet comparison; html is the CI artifact.
      reporter: ['text', 'json-summary', 'html'],
    },
  },
})
