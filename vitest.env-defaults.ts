/**
 * Placeholder values for the variables `src/env.ts` requires.
 *
 * `src/env.ts` validates the environment the moment it is imported, so any test
 * that reaches it — directly or through a module that reads configuration —
 * throws without these. Deliberately obvious non-values: a test that appears to
 * need real credentials is a test that belongs in a tier that provisions them.
 *
 * Shared by both tiers' setup files. The integration tier overrides the ones it
 * has real infrastructure for (the database URL, the Garage endpoint and
 * credentials) once its containers are running; these keep the *rest* of the
 * schema satisfiable so importing a storage module does not fail on unrelated
 * variables.
 */
export const placeholderEnv: Record<string, string> = {
  DATABASE_URL: 'postgres://unit:test@localhost:5432/unit-tests',
  BETTER_AUTH_SECRET: 'unit-test-placeholder-secret-32-chars-min',
  BETTER_AUTH_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'unit-test-placeholder-client-id',
  GOOGLE_CLIENT_SECRET: 'unit-test-placeholder-client-secret',
  ZERO_QUERY_API_KEY: 'unit-test-placeholder-zero-query-api-key',
  ZERO_MUTATE_API_KEY: 'unit-test-placeholder-zero-mutate-api-key',
  GARAGE_ENDPOINT: 'http://localhost:3900',
  // Shaped like a real Garage key id because src/env.ts validates the shape
  // (`GK` then hex); the hex itself is meaningless.
  GARAGE_ACCESS_KEY_ID: 'GK000000000000000000000000',
  GARAGE_SECRET_ACCESS_KEY: 'unit-test-placeholder-garage-secret-key',
  GARAGE_BUCKET: 'unit-tests',
}

/** Applies the placeholders without overwriting anything already set. */
export function applyPlaceholderEnv(): void {
  for (const [name, value] of Object.entries(placeholderEnv)) {
    process.env[name] ??= value
  }
}
