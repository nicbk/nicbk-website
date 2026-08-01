import { join } from 'node:path'
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'

/**
 * The same image the Compose stack runs, so integration tests exercise the
 * real Postgres version production uses rather than a convenient stand-in.
 */
const POSTGRES_IMAGE = 'postgres:18.4'

/** Snapshot taken once the schema exists; every test restores back to it. */
const CLEAN_SNAPSHOT = 'migrated_empty'

export interface TestDatabase {
  /** Connection string for the ephemeral database. */
  connectionString: string
  /** Restores the database to its just-migrated, empty state. */
  reset: () => Promise<void>
  /** Stops the container. */
  stop: () => Promise<void>
}

/**
 * Starts a throwaway Postgres in Docker, applies the committed migrations to
 * it, and snapshots the result.
 *
 * Real migrations against a real Postgres, once per suite — the integration
 * tier decided in research/testing-qa/integration-testing-strategy.md. Tests
 * that ran against a hand-built schema (or SQLite) could pass while the
 * migrations that actually ship are broken.
 *
 * Isolation between tests is Postgres-level: `reset()` restores the snapshot
 * taken right after migration, so each test starts from an empty schema
 * without re-running migrations. That doc's transaction-rollback-per-test
 * suggestion doesn't fit here — the code under test (Better Auth through its
 * Drizzle adapter) takes its own connections from its own pool, so a
 * transaction held open by the test would be invisible to it. Restoring a
 * snapshot gives the same isolation for code that manages its own connections.
 *
 * Callers must open their pools *after* each `reset()`: restoring drops and
 * recreates the database, which severs any connection already open to it.
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    POSTGRES_IMAGE,
  ).start()
  const connectionString = container.getConnectionUri()

  const pool = new Pool({ connectionString })
  try {
    await migrate(drizzle(pool), {
      migrationsFolder: join(process.cwd(), 'src/db/migrations'),
    })
  } finally {
    await pool.end()
  }

  await container.snapshot(CLEAN_SNAPSHOT)

  return {
    connectionString,
    reset: () => container.restoreSnapshot(CLEAN_SNAPSHOT),
    stop: async () => {
      await container.stop()
    },
  }
}
