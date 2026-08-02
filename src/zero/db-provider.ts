import { zeroDrizzle } from '@rocicorp/zero/server/adapters/drizzle'
import { db } from '~/db/client'
import { schema } from './schema.gen'

/**
 * How server-side ZQL reaches Postgres: Zero's Drizzle adapter over the
 * application's existing client.
 *
 * The same pool the rest of the server uses, not a second one — mutators run
 * inside a transaction on it, so a write and the reads that validated it commit
 * or roll back together. This is also what lets a test run the real query
 * definitions against a real database, which is the only way to prove that user
 * B's rows stay invisible while genuinely present.
 *
 * Server-only. Importing this module pulls in the Postgres driver and the
 * validated environment, so it must never be reached from a client bundle.
 */
export const dbProvider = zeroDrizzle(schema, db)

declare module '@rocicorp/zero' {
  interface DefaultTypes {
    dbProvider: typeof dbProvider
  }
}
