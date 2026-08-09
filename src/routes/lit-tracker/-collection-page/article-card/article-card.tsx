import { Tooltip } from '@base-ui/react/tooltip'
import type { ReactElement } from 'react'
import type { Author } from '~/db/schema/lit-tracker'
import type { ArticleStatus } from '~/lit-tracker/article-status'
import { formatAuthors } from '../authors'
import type { CollectionTag } from './article-menu/article-menu'
import { ArticleMenu } from './article-menu/article-menu'
import { CardFooter } from './card-footer/card-footer'
import styles from './article-card.module.css'

/**
 * One article in the collection, as a card.
 *
 * The decided presentation
 * (research/ui-ux/pages/lit-tracker/pages/collection-view.md): title, authors,
 * publication year, and tags — plus **venue**, added to that list with the user
 * because #7's enrichment recovers it reliably and no surface on the site
 * displays it. Task 1 drew everything but the tags and the menu; task 2 adds
 * both, and with them the first thing on a card a reader can actually operate.
 *
 * Presentational, and deliberately unaware of Zero: it takes a row, a tag list,
 * and callbacks, which is what lets it be asserted without a client.
 * `ArticleCollection` next door owns the states, and `CollectionPage` above that
 * owns the query and the mutations.
 *
 * **Still not a link.** The decided click target is the article detail page,
 * which is #9 and does not exist yet. The card is now interactive in one place —
 * the menu in its corner — and nowhere else, so a reader who clicks the body of
 * a card gets nothing rather than something misleading.
 */

/**
 * The article fields this surface shows — deliberately not the whole row.
 *
 * Every field but the title and authors is optional in the data, and optional in
 * the same way it is optional in real papers: a preprint has no venue, a scanned
 * document can lose its year. The card renders what is there and nothing in
 * place of what is not.
 *
 * `status` is the exception that only looks like one. The column is `not null`
 * with a default of `pending`, so Postgres never holds a null — but Zero types
 * any defaulted column as optional, because a client creating a row may omit it
 * and let the server fill it in. The null is therefore a fact about the sync
 * engine's types rather than about the data, and the card reads it as `pending`.
 */
export interface CollectionArticle {
  id: string
  title: string
  authors: readonly Author[]
  publicationYear: number | null
  venue: string | null
  status: ArticleStatus | null
}

interface ArticleCardProps {
  article: CollectionArticle
  /** This article's own tags, for the chips. */
  tags: readonly CollectionTag[]
  /** Every tag the reader has, for the menu's checklist. */
  allTags: readonly CollectionTag[]
  onSetStatus: (status: ArticleStatus) => void
  onToggleTag: (tagId: string, applied: boolean) => void
  onCreateTag: (name: string) => void
}

export function ArticleCard({
  article,
  tags,
  allTags,
  onSetStatus,
  onToggleTag,
  onCreateTag,
}: ArticleCardProps) {
  const { title, authors, publicationYear, venue } = article
  // See `CollectionArticle`: the null is Zero's, not Postgres's.
  const status = article.status ?? 'pending'
  const authorLine = formatAuthors(authors)
  const meta = formatPublication(publicationYear, venue)
  const appliedTagIds = new Set(tags.map((tag) => tag.id))

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <ElidedText text={title}>
          <h2 className={styles.title}>{title}</h2>
        </ElidedText>

        <ArticleMenu
          articleTitle={title}
          status={status}
          allTags={allTags}
          appliedTagIds={appliedTagIds}
          onSetStatus={onSetStatus}
          onToggleTag={onToggleTag}
          onCreateTag={onCreateTag}
        />
      </div>

      <ElidedText text={authorLine}>
        <p className={styles.authors}>{authorLine}</p>
      </ElidedText>

      {meta !== null && (
        <ElidedText text={meta}>
          <p className={styles.meta}>{meta}</p>
        </ElidedText>
      )}

      <CardFooter status={status} tags={tags} />
    </article>
  )
}

interface ElidedTextProps {
  /** The whole string, for the tooltip. */
  text: string
  /** The clamped element it belongs to, which becomes the trigger itself. */
  children: ReactElement
}

/**
 * Puts the full text of a clamped line behind a tooltip.
 *
 * Every text line on this card is clamped, because the card is one cell of a
 * uniform grid and a long title must not make its card taller than its
 * neighbours. This is what keeps the elided remainder reachable.
 *
 * **Base UI's `Tooltip` rather than the native `title` attribute** (user-decided
 * at the start of task 2, replacing task 1's choice). What it buys is a tooltip
 * styled like the rest of the tracker, positioned so it is not clipped by the
 * panel, and free of `title`'s uncontrollable delay and appearance.
 *
 * **It is an affordance for readers who can see the ellipsis, and only that.**
 * The clamping is CSS: the whole string is in the DOM and in the accessibility
 * tree whether or not it is drawn, so a screen reader was never missing
 * anything, and Base UI's own examples confirm the popup is not the trigger's
 * accessible description — their triggers carry an `aria-label` repeating it.
 * The trigger is therefore left un-focusable, which is the point task 1 made and
 * this still honours: three tab stops per card, in a grid of cards, to reach
 * text already being announced in full would be worse than useless.
 *
 * The tooltip is attached unconditionally, because whether a given string
 * actually overflows depends on the rendered width, which is not something this
 * component can know.
 */
function ElidedText({ text, children }: ElidedTextProps) {
  return (
    <Tooltip.Root>
      {/* `render` composes the trigger onto the clamped element itself rather
          than wrapping it in another box — a wrapper would break the grid and
          flex sizing the clamping depends on. */}
      <Tooltip.Trigger render={children} />
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6}>
          <Tooltip.Popup className={styles.tooltip}>{text}</Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
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
