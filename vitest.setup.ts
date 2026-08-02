// Placeholder configuration for the unit tier. src/env.ts validates the
// environment when it is imported and now requires database and OAuth
// settings, so importing anything that reaches it would otherwise throw here.
// Deliberately obvious non-values: nothing in the unit tier connects to a
// database or talks to Google, and a test that appears to need real
// credentials is a test that belongs in the integration tier instead.
const placeholderEnv: Record<string, string> = {
  DATABASE_URL: 'postgres://unit:test@localhost:5432/unit-tests',
  BETTER_AUTH_SECRET: 'unit-test-placeholder-secret-32-chars-min',
  BETTER_AUTH_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'unit-test-placeholder-client-id',
  GOOGLE_CLIENT_SECRET: 'unit-test-placeholder-client-secret',
  ZERO_QUERY_API_KEY: 'unit-test-placeholder-zero-query-api-key',
  ZERO_MUTATE_API_KEY: 'unit-test-placeholder-zero-mutate-api-key',
}
for (const [name, value] of Object.entries(placeholderEnv)) {
  process.env[name] ??= value
}

// Registers @testing-library/jest-dom's matchers (toBeInTheDocument, …) on
// Vitest's expect for every test file.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Testing Library only auto-registers DOM cleanup when test globals exist;
// this project keeps Vitest globals off, so register it explicitly.
afterEach(() => {
  cleanup()
})
