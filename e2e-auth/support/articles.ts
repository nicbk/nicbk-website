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
  {
    title,
    authors = [],
    publicationYear = null,
    venue = null,
  }: {
    title: string
    authors?: { name: string }[]
    /** Both default to null — the shape a preprint really has. */
    publicationYear?: number | null
    venue?: string | null
  },
): Promise<InsertedArticle> {
  const id = randomUUID()
  await connection().query(
    `insert into articles
       (id, user_id, title, authors, publication_year, venue, pdf_object_key)
     values ($1, $2, $3, $4::jsonb, $5, $6, $7)`,
    [
      id,
      userId,
      title,
      JSON.stringify(authors),
      publicationYear,
      venue,
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
 * Read from the database rather than the page because most of it still renders
 * nowhere: #8's first task put the venue and the year on the card, but the
 * extraction status and the Semantic Scholar id have no display surface at all,
 * and the citation graph waits for #10. What the browser proves here is the live
 * round-trip; what the database proves is that the round-trip enriched anything.
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
 * Removes every tag this user has, and with it every application by cascade.
 *
 * Separate from `deleteArticlesOf` because a tag outlives the articles it was
 * applied to — clearing the collection does not clear the tag list, and a spec
 * that assumed it did would find the previous spec's tags in its card menu.
 */
export async function deleteTagsOf(userId: string): Promise<void> {
  await connection().query('delete from tags where user_id = $1', [userId])
}

/** One tag as stored, with how many articles carry it. */
export interface StoredTag {
  name: string
  applied: number
}

/**
 * This user's tags, read straight out of Postgres.
 *
 * The point of asking the database rather than the page: a tag on a card may be
 * an optimistic local write that the server never accepted. Only this says the
 * write actually landed.
 */
export async function tagsOf(userId: string): Promise<StoredTag[]> {
  const { rows } = await connection().query<{ name: string; applied: string }>(
    `select t.name, count(at.id) as applied
       from tags t left join article_tags at on at.tag_id = t.id
      where t.user_id = $1
      group by t.name order by t.name`,
    [userId],
  )
  return rows.map((row) => ({ name: row.name, applied: Number(row.applied) }))
}

/** Creates a tag directly, for a spec that needs one to already exist. */
export async function insertTag(
  userId: string,
  name: string,
): Promise<{ id: string; name: string }> {
  const id = randomUUID()
  await connection().query(
    'insert into tags (id, user_id, name) values ($1, $2, $3)',
    [id, userId, name],
  )
  return { id, name }
}

/**
 * Applies a tag that already exists to an article.
 *
 * Distinct from `tagArticleWith`, which makes a new tag per name: the filter
 * specs need *one* tag on *several* articles, which is the whole point of an
 * AND-composed filter and impossible to set up with a helper that creates as it
 * applies.
 */
export async function applyTagTo(
  articleId: string,
  tagId: string,
): Promise<void> {
  await connection().query(
    'insert into article_tags (id, article_id, tag_id) values ($1, $2, $3)',
    [randomUUID(), articleId, tagId],
  )
}

/**
 * Creates several tags and applies all of them to one article.
 *
 * For the layout case a single tag cannot produce: a card carrying more tags
 * than fit across it. Written straight to the database rather than through the
 * menu because what is being set up is a *rendering* condition, and twelve trips
 * through a popup would be twelve chances for the setup to fail for reasons the
 * test is not about.
 */
export async function tagArticleWith(
  userId: string,
  articleId: string,
  names: readonly string[],
): Promise<void> {
  for (const name of names) {
    const { id } = await insertTag(userId, name)
    await connection().query(
      'insert into article_tags (id, article_id, tag_id) values ($1, $2, $3)',
      [randomUUID(), articleId, id],
    )
  }
}

/** The reading status stored for the article with this title. */
export async function statusOfArticle(
  userId: string,
  title: string,
): Promise<string | undefined> {
  const { rows } = await connection().query<{ status: string }>(
    'select status from articles where user_id = $1 and title = $2',
    [userId, title],
  )
  return rows[0]?.status
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
