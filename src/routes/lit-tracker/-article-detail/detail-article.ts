import type { Author } from '~/db/schema/lit-tracker'
import type { ArticleStatus } from '~/lit-tracker/article-status'

/**
 * The article fields this page reads, and how its publication line is written.
 *
 * Its own module because nothing on this page owns it any more: the title is in
 * the header's breadcrumb, the authors and venue are in the three-dot menu, and
 * the notes are in the sidebar. It used to live beside the metadata header that
 * showed all of them at once, and that header is gone.
 */

/**
 * The same optionality as the card's `CollectionArticle`, and for the same
 * reason: a preprint has no venue, a scanned document can lose its year, and
 * `status` is typed optional by Zero because a client may create a row without
 * it even though the column is `not null`. `notes` joins them here — it is the
 * one field on this page nothing else on the site reads.
 */
export interface DetailArticle {
  id: string
  title: string
  authors: readonly Author[]
  publicationYear: number | null
  venue: string | null
  status: ArticleStatus | null
  notes: string | null
}

/**
 * Year and venue as one line, with whichever of them exists.
 *
 * The same rule the card follows, deliberately duplicated as a two-line function
 * rather than shared: the card elides this line and the menu does not, and a
 * shared helper would be one import binding two surfaces that are about to
 * diverge for good reasons. If a third surface wants it, that is the point to
 * extract it.
 */
export function formatPublication(
  publicationYear: number | null,
  venue: string | null,
): string | null {
  const parts = [publicationYear, venue].filter(
    (part): part is number | string => part !== null && part !== '',
  )
  return parts.length === 0 ? null : parts.join(', ')
}
