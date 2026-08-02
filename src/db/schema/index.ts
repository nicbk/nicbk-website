/**
 * The database schema, as one namespace.
 *
 * Split by owner rather than by table: `identity.ts` is **generated** from the
 * Better Auth configuration and must not be hand-edited, while every
 * application-owned table is hand-written in a sibling file. Keeping the
 * generated file separate is what lets `scripts/gen-auth-schema.mjs` overwrite
 * it wholesale without touching anything this project decided for itself.
 *
 * Drizzle's client, `drizzle-kit generate`, and `drizzle-zero` all read this
 * module, so a new table becomes visible to migrations and to the Zero schema
 * by being exported from a file re-exported here.
 */
export * from './identity'
export * from './lit-tracker'
