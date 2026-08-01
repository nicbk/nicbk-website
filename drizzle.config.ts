import { defineConfig } from 'drizzle-kit'

/**
 * Drizzle Kit configuration — used only by the developer tooling that turns a
 * schema change into a committed SQL migration:
 *
 *   node scripts/gen-auth-schema.mjs   # regenerate the identity schema
 *   npx drizzle-kit generate           # diff it into src/db/migrations/*.sql
 *
 * Applying migrations is a separate concern: production runs the committed SQL
 * through scripts/migrate.mjs as a Compose `pre_start` step, so no Drizzle Kit
 * tooling (and no database URL) is needed at deploy time. `dbCredentials` is
 * therefore only for ad-hoc local commands like `drizzle-kit studio`.
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/unset',
  },
})
