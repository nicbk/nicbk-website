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
      // Coverage is wired here as the ratchet baseline; the enforcing
      // ratchet gate lands with the extended CI in the
      // containerization-and-deployment task.
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/routeTree.gen.ts'],
      reporter: ['text', 'html'],
    },
  },
})
