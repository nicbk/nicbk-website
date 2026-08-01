/**
 * Apply committed SQL migrations to the database, then exit.
 *
 * This runs as the app service's Compose `pre_start` step: an ephemeral
 * container that must exit 0 before the server container starts, so the schema
 * is never behind the code that queries it
 * (research/devops-deployment/database-migrations.md). Deliberately not part of
 * server startup — a migration failure should stop the deploy, not leave a
 * half-migrated server accepting traffic.
 *
 * Drizzle's migrator records what it has applied in a `__drizzle_migrations`
 * table, so re-running is a no-op: every `docker compose up` executes this, and
 * only genuinely new migrations run.
 *
 * The production image has no node_modules, so the build stage bundles this
 * file (with its two dependencies) into .output/migrate.mjs; the SQL files
 * themselves are copied alongside. `MIGRATIONS_DIR` lets the container point at
 * them explicitly rather than depending on where the bundle happens to sit.
 */
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run migrations.')
}

const migrationsFolder =
  process.env.MIGRATIONS_DIR ??
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'db', 'migrations')

const pool = new Pool({ connectionString })
try {
  await migrate(drizzle(pool), { migrationsFolder })
  console.log(`Migrations applied from ${migrationsFolder}`)
} finally {
  await pool.end()
}
