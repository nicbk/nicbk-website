/**
 * The one placeholder environment that satisfies `src/env.ts`.
 *
 * Several tools import the app's modules without a real `.env`: the unit and
 * integration test tiers, the Playwright config's app server, and the Better
 * Auth schema generator (which loads `src/auth/auth.ts`, and through it the
 * validated environment). `src/env.ts` throws the moment it is imported with a
 * variable missing, so each of them needs a full set of values.
 *
 * They share this one because keeping separate copies has broken CI twice: a
 * variable added to the schema satisfied the copy in front of us and not the
 * two we were not looking at, and the failure surfaced a job — or a whole
 * task — later. `placeholder-env.test.mjs` now asserts this set covers every
 * required key, so a missing one fails in `npm test` and names itself.
 *
 * Deliberately obvious non-values. Nothing that reads these connects to
 * anything: a tool that appears to need real credentials is a tool that belongs
 * in a tier which provisions them.
 *
 * Plain `.mjs` (with a sibling `.d.mts` for the TypeScript importers) because
 * the schema generator is a standalone script run by `node`, with no build step
 * and no TypeScript loader.
 */
export const placeholderEnv = {
  DATABASE_URL: 'postgres://placeholder:placeholder@localhost:5432/unused',
  BETTER_AUTH_SECRET: 'placeholder-secret-at-least-32-characters',
  BETTER_AUTH_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'placeholder-google-client-id',
  GOOGLE_CLIENT_SECRET: 'placeholder-google-client-secret',
  ZERO_QUERY_API_KEY: 'placeholder-zero-query-api-key-32-chars-min',
  ZERO_MUTATE_API_KEY: 'placeholder-zero-mutate-api-key-32-chars-min',
  GARAGE_ENDPOINT: 'http://localhost:3900',
  // Shaped like a real Garage key id because src/env.ts validates the shape
  // (`GK` then hex); the hex itself is meaningless.
  GARAGE_ACCESS_KEY_ID: 'GK000000000000000000000000',
  GARAGE_SECRET_ACCESS_KEY: 'placeholder-garage-secret-access-key',
  GARAGE_BUCKET: 'unused',
}
