import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

/** A Drizzle client bound to a connection pool, plus the pool itself. */
export interface DatabaseHandle {
  /** Query interface, typed by the schema in `schema.ts`. */
  db: ReturnType<typeof drizzle<typeof schema>>
  /** The underlying pool, exposed so callers that own it can close it. */
  pool: Pool
}

/**
 * Builds a Drizzle client over a `pg` pool for the given connection string.
 *
 * A factory rather than a module-level singleton so a caller can point at a
 * database chosen at runtime — which is what the integration tests do, against
 * the ephemeral Postgres that Testcontainers starts. The application's own
 * singleton, built from the validated environment, lives in `client.ts`.
 */
export function createDatabase(connectionString: string): DatabaseHandle {
  const pool = new Pool({ connectionString })
  return { db: drizzle(pool, { schema }), pool }
}
