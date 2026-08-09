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

/** What enrichment left on an article, read straight out of Postgres. */
export interface StoredEnrichment {
  extraction_status: string
  semantic_scholar_id: string | null
  venue: string | null
  publication_year: number | null
}

/**
 * The enrichment columns of the article with this title.
 *
 * Read from the database rather than the page because **nothing renders any of
 * it yet** — the collection list shows a title and its authors, and the venue,
 * the year and the citation graph arrive with #8 and #10. The task's testing.md
 * asked for "enriched metadata visible" in the browser, which is not something
 * this task can deliver without building #8's UI inside it. What the browser
 * proves here is the live round-trip; what the database proves is that the
 * round-trip enriched anything.
 */
export async function enrichmentOfArticle(
  userId: string,
  title: string,
): Promise<StoredEnrichment | undefined> {
  const { rows } = await connection().query<StoredEnrichment>(
    `select extraction_status, semantic_scholar_id, venue, publication_year
       from articles where user_id = $1 and title = $2`,
    [userId, title],
  )
  return rows[0]
}

/** One bibliography entry as stored, resolved or not. */
export interface StoredEdge {
  title: string
  semantic_scholar_id: string | null
  cited_article_id: string | null
}

/** This user's citation edges, whichever article they came out of. */
export async function citationEdgesOf(userId: string): Promise<StoredEdge[]> {
  const { rows } = await connection().query<StoredEdge>(
    `select title, semantic_scholar_id, cited_article_id
       from citation_edges where user_id = $1 order by title`,
    [userId],
  )
  return rows
}

/** Removes every article owned by `userId`, so specs start from a known state. */
export async function deleteArticlesOf(userId: string): Promise<void> {
  await connection().query('delete from articles where user_id = $1', [userId])
}

/**
 * Removes everything an upload leaves behind: the article and the job row.
 *
 * Both, because since task 4 the extraction worker resolves jobs for real — a
 * finished upload leaves an article in the collection and a failed one leaves
 * an article *and* a warning row. Either would leak into the next spec, through
 * the list or through the status indicator.
 *
 * Articles first: `upload_jobs.article_id` cascades, so this also takes the
 * rows of anything that got as far as an article.
 */
export async function clearUploadsOf(userId: string): Promise<void> {
  await connection().query('delete from articles where user_id = $1', [userId])
  await connection().query('delete from upload_jobs where user_id = $1', [
    userId,
  ])
}
