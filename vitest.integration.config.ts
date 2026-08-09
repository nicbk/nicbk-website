import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

/**
 * The integration tier: tests that run against real infrastructure started by
 * Testcontainers, rather than against mocks
 * (research/testing-qa/integration-testing-strategy.md).
 *
 * Separate from vitest.config.ts because these tests need the opposite of what
 * the unit tier wants — a Node environment rather than jsdom, no DOM-testing
 * setup, minutes rather than seconds of timeout, and no parallelism (they
 * share one container). They also need Docker, so they run as their own CI job
 * instead of blocking every `npm test`.
 */
export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
      '~blog': fileURLToPath(new URL('./blog', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    // Only the environment placeholders, not the unit tier's DOM setup: these
    // tests reach modules that validate configuration at import time.
    setupFiles: ['./vitest.integration.setup.ts'],
    include: ['src/**/*.integration.test.ts'],
    // One container is shared across the file's tests, which restore a
    // snapshot between them — concurrent files would race over that database.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
})
