import { env } from '~/env'
import { createDatabase } from './create-database'

/**
 * The application's shared database client, pointed at `DATABASE_URL`.
 *
 * One pool per server process: `pg` multiplexes queries over it, so importing
 * this module from anywhere reuses the same connections rather than opening
 * new ones. Tests never import this — they build their own handle with
 * `createDatabase` so they can target a throwaway database.
 */
const { db, pool } = createDatabase(env.DATABASE_URL)

export { db, pool }
