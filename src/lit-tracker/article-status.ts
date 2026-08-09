/**
 * Where the reader has got to with a paper.
 *
 * Its own module, holding nothing but this, because the three places that need
 * it sit on opposite sides of the client/server boundary: the Drizzle schema
 * that types the column, the Zero mutator that validates an incoming value, and
 * the card control that offers the three choices. Zero's mutators are shared
 * code by design — the same definitions run in the browser to apply a write
 * optimistically and on the server to authorize it — so a mutator importing
 * this from `db/schema/lit-tracker.ts` would pull `drizzle-orm/pg-core`, and
 * with it a Postgres dialect, into the client bundle to read three strings.
 *
 * A value list rather than a bare union type, because two of those three
 * consumers need the values at runtime. The order is reading order, and it is
 * the order the control offers them in.
 */
export const ARTICLE_STATUSES = ['pending', 'reading', 'read'] as const

/** Mutually exclusive by construction: it is one column, not three flags. */
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number]

/**
 * How a status is written where the reader sees it.
 *
 * The values are already lowercase English words, and this site's surfaces are
 * lowercase throughout, so today this is an identity map. It exists so that the
 * stored vocabulary and the displayed vocabulary are separable — renaming what
 * `pending` *reads as* must never become a migration.
 */
export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  pending: 'pending',
  reading: 'reading',
  read: 'read',
}
