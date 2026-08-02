import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { Pool } from 'pg'
import { DATABASE_URL } from './services.mjs'

/**
 * Writing articles straight into Postgres, from the spec process.
 *
 * Deliberately not through the app: the point of the Lit Tracker's live-sync
 * coverage is that a row appearing in the database reaches an open page without
 * the browser asking for it. Going through an app endpoint would prove the
 * request round trip instead — and there is no write endpoint yet anyway, since
 * uploads arrive in task 3.
 *
 * This is also the closest stand-in available for what will really write these
 * rows: a background job handler in another process
 * (research/system-architecture/reactivity-propagation.md notes that sync is
 * write-origin-agnostic, which is exactly what this exercises).
 */

/** One pool for the whole run; opened lazily so specs that never write pay nothing. */
let pool: Pool | undefined

function connection(): Pool {
  pool ??= new Pool({ connectionString: DATABASE_URL })
  return pool
}

/** Closes the pool, so a finished run leaves no connection behind. */
export async function closeArticleConnection(): Promise<void> {
  await pool?.end()
  pool = undefined
}

/**
 * The signed-in user's id, read from the app's own session endpoint.
 *
 * Asked of the server rather than looked up in the database, so a spec inserts
 * rows for exactly the account the browser is holding a session for — which is
 * the thing the ownership scoping is about.
 */
export async function signedInUserId(page: Page): Promise<string> {
  const response = await page.request.get('/api/auth/get-session')
  const session = (await response.json()) as { user?: { id?: string } } | null
  const id = session?.user?.id
  if (typeof id !== 'string') {
    throw new Error('no signed-in session to read a user id from')
  }
  return id
}

interface InsertedArticle {
  id: string
  title: string
}

/**
 * Inserts one article owned by `userId` and returns what it wrote.
 *
 * Only the columns without a default are supplied — the reading status, the
 * extraction status, and both timestamps come from the migration, which is part
 * of what this is checking. `id` has no default on `articles` (only
 * `upload_jobs` carries `uuidv7()`, per the pre-allocated-id design in
 * research/data-modeling/upload-jobs-schema.md), so it is generated here.
 */
export async function insertArticle(
  userId: string,
  { title, authors = [] }: { title: string; authors?: { name: string }[] },
): Promise<InsertedArticle> {
  const id = randomUUID()
  await connection().query(
    `insert into articles (id, user_id, title, authors, pdf_object_key)
     values ($1, $2, $3, $4::jsonb, $5)`,
    [
      id,
      userId,
      title,
      JSON.stringify(authors),
      `lit-tracker/${userId}/${id}/source.pdf`,
    ],
  )
  return { id, title }
}

/** Removes every article owned by `userId`, so specs start from a known state. */
export async function deleteArticlesOf(userId: string): Promise<void> {
  await connection().query('delete from articles where user_id = $1', [userId])
}
