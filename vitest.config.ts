import { fileURLToPath } from 'node:url'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { mdxPlugin } from './blog/mdx-plugins'

// Kept separate from vite.config.ts: unit tests don't need (or want) the
// full TanStack Start plugin pipeline — they run against plain modules and
// components in jsdom. The MDX + React plugins ARE replicated here, though, so
// unit tests can import and render `.mdx` fixtures through the same compile
// pipeline the real build uses (a separate config otherwise wouldn't transform
// `.mdx` at all).
export default defineConfig({
  plugins: [mdxPlugin(), viteReact({ include: /\.(jsx|js|mdx|md|tsx|ts)$/ })],
  resolve: {
    alias: {
      // Mirrors the `~/` → ./src and `~blog/` → ./blog aliases from
      // tsconfig.json `paths`.
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      '~blog': fileURLToPath(new URL('./blog', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Unit tests only — Playwright owns e2e/*.spec.ts (its default
    // include pattern would otherwise pick those up too). The scripts glob
    // covers pure helpers in build tooling (e.g. the gpg-artifact generator),
    // which live outside src/ and so outside the coverage `include` below.
    include: [
      'src/**/*.test.{ts,tsx}',
      'blog/**/*.test.{ts,tsx}',
      'scripts/**/*.test.mjs',
    ],
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
