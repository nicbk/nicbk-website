/**
 * Where an article's PDF lives in the blob store.
 *
 * The layout is decided, not incidental —
 * research/data-modeling/article-core-schema.md fixes it as
 * `lit-tracker/{user_id}/{article_id}/source.pdf`, and the columns that hold it
 * (`articles.pdf_object_key`, `upload_jobs.pdf_object_key`) store exactly this
 * string.
 *
 * Two things about the shape are load-bearing:
 *
 * **The owner comes first.** Everything belonging to one user shares a prefix,
 * which is what makes "delete this account's files" a prefix operation rather
 * than a scan. It also makes a mismatched key obvious on sight — a key whose
 * second segment is not the requester is not theirs, and `pdfObjectKey` below
 * is what a read path compares against.
 *
 * **The id is the article's, allocated before the article exists.** An upload
 * writes its PDF under the `upload_jobs.id` that Postgres generated for it, and
 * the extract stage later inserts the `articles` row under that same id
 * (upload-jobs-schema.md's pre-allocated-id design). So no blob is ever copied
 * or renamed once the article appears.
 *
 * Kept free of any S3 dependency so it can be tested — and reasoned about — as
 * the pure string function it is.
 */

/** The one prefix this sub-application owns; other sub-apps get their own. */
const LIT_TRACKER_PREFIX = 'lit-tracker'

/** The object name under an article's folder. Fixed: one source PDF per article. */
const SOURCE_PDF = 'source.pdf'

/**
 * The key an article's source PDF is stored under.
 *
 * `articleId` is the pre-allocated id — the `upload_jobs.id` at upload time,
 * and the `articles.id` from extraction onwards. They are the same value.
 */
export function pdfObjectKey(userId: string, articleId: string): string {
  return `${LIT_TRACKER_PREFIX}/${userId}/${articleId}/${SOURCE_PDF}`
}

/**
 * Whether a stored key belongs to a given user.
 *
 * This is a **check, not the authorization** — a read path must already know
 * which user is asking, from the session. It exists so that a key read back out
 * of the database is confirmed to match the requester before it is fetched,
 * which turns a mixed-up row into a refusal instead of one user's PDF being
 * served to another.
 */
export function isOwnedBy(key: string, userId: string): boolean {
  return key.startsWith(`${LIT_TRACKER_PREFIX}/${userId}/`)
}
