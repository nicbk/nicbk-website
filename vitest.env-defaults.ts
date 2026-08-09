import { placeholderEnv } from './scripts/placeholder-env.mjs'

/**
 * Applies the shared placeholder values for the variables `src/env.ts` requires.
 *
 * `src/env.ts` validates the environment the moment it is imported, so any test
 * that reaches it — directly or through a module that reads configuration —
 * throws without these. Deliberately obvious non-values: a test that appears to
 * need real credentials is a test that belongs in a tier that provisions them.
 *
 * The values themselves live in scripts/placeholder-env.mjs, shared with the
 * Playwright config and the Better Auth schema generator. The integration tier
 * overrides the ones it has real infrastructure for (the database URL, the
 * Garage endpoint and credentials) once its containers are running; these keep
 * the *rest* of the schema satisfiable so importing a storage module does not
 * fail on unrelated variables.
 */

/** Applies the placeholders without overwriting anything already set. */
export function applyPlaceholderEnv(): void {
  for (const [name, value] of Object.entries(placeholderEnv)) {
    process.env[name] ??= value
  }
}
