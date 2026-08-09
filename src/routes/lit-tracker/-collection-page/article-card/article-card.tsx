import type { Author } from '~/db/schema/lit-tracker'
import { formatAuthors } from '../authors'
import styles from './article-card.module.css'

/**
 * One article in the collection, as a card.
 *
 * The decided presentation
 * (research/ui-ux/pages/lit-tracker/pages/collection-view.md): title, authors,
 * publication year, and tags — plus **venue**, added to that list with the user
 * because #7's enrichment recovers it reliably and no surface on the site
 * displays it. Tags and the three-dot menu are task 2's; everything else on the
 * card is here.
 *
 * Presentational, and deliberately unaware of Zero: it takes a row and draws it,
 * which is what lets it be asserted without a client. `ArticleCollection` next
 * door owns the states, and `CollectionPage` above that owns the query.
 *
 * **Not a link, on purpose.** The decided click target is the article detail
 * page, which is #9 and does not exist yet. A card that looks clickable and does
 * nothing is worse than one that plainly is not, so there is no anchor, no
 * handler, and no pointer affordance until #9 adds them.
 */

/**
 * The article fields this surface shows — deliberately not the whole row.
 *
 * Every field but the title and authors is optional in the data, and optional in
 * the same way it is optional in real papers: a preprint has no venue, a scanned
 * document can lose its year. The card renders what is there and nothing in
 * place of what is not.
 */
export interface CollectionArticle {
  id: string
  title: string
  authors: readonly Author[]
  publicationYear: number | null
  venue: string | null
}

export function ArticleCard({ article }: { article: CollectionArticle }) {
  const { title, authors, publicationYear, venue } = article
  const authorLine = formatAuthors(authors)
  const meta = formatPublication(publicationYear, venue)

  return (
    <article className={styles.card}>
      {/*
        Every line carries its own text as a `title`, because every line is
        clamped: the card is one cell of a uniform grid, so a long title is
        elided rather than allowed to make its card taller than its neighbours.
        The native tooltip is what keeps the elided text reachable, and it costs
        no component and no focus management to do it. It is set unconditionally
        — whether a given string overflows depends on the rendered width, which
        is not something this component knows.
      */}
      <h2 className={styles.title} title={title}>
        {title}
      </h2>
      <p className={styles.authors} title={authorLine}>
        {authorLine}
      </p>
      {meta !== null && (
        <p className={styles.meta} title={meta}>
          {meta}
        </p>
      )}
    </article>
  )
}

/**
 * When and where the paper appeared, as one line: `year, venue`.
 *
 * Both halves are optional and often absent — a preprint has no venue, and a
 * scanned document can lose its year — so this returns null rather than an empty
 * line when neither is known, and omits the comma when only one is.
 *
 * **The year leads because this line is elided, not wrapped.** Venue names run
 * long ("Advances in Neural Information Processing Systems") and are cut off in
 * a card of any ordinary width; whichever half comes second is the half a reader
 * loses. A truncated venue is still recognisable from its opening words, while a
 * missing year tells you nothing at all — so the year goes first and the venue
 * absorbs the truncation. (Written venue-first at one point, which put the year
 * past the ellipsis on most real papers.)
 *
 * A comma rather than a middot separator: this string is read aloud as well as
 * shown, and a middot is announced as one by some screen readers.
 */
function formatPublication(
  publicationYear: number | null,
  venue: string | null,
): string | null {
  const parts = [publicationYear?.toString(), venue].filter(
    (part) => part !== null && part !== undefined,
  )
  return parts.length > 0 ? parts.join(', ') : null
}
