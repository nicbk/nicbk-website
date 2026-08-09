import { Tooltip } from '@base-ui/react/tooltip'
import { BookmarkCheck, BookOpen, Circle } from 'lucide-react'
import type { ArticleStatus } from '~/lit-tracker/article-status'
import { ARTICLE_STATUS_LABELS } from '~/lit-tracker/article-status'
import type { CollectionTag } from '../article-menu/article-menu'
import styles from './card-footer.module.css'

interface CardFooterProps {
  status: ArticleStatus
  /** The user tags this article carries, already in the order to show them. */
  tags: readonly CollectionTag[]
}

/**
 * The foot of a card: the reader's own tags on the left, the article's reading
 * status as a single icon on the right.
 *
 * **Status is deliberately quiet.** It was a chip like any tag first — the
 * decided model says status "renders as a tag" — and on a real card that read
 * louder than the title: an outlined box with a word in it, sitting under a
 * title that is only text. The model survives where it matters (status is still
 * one of the things a card shows, and #8's rail will still filter on it beside
 * real tags); what changed is the weight. An icon says the same thing in a
 * fraction of the space, so the card reads as a paper with some labels on it
 * rather than as a status indicator with a paper attached.
 *
 * The icon differs per status rather than only its color, so it survives
 * grayscale (WCAG 1.4.1), and it carries both a tooltip for a reader who can see
 * it and an accessible name for one who cannot — the same arrangement the upload
 * indicator uses, and for the same reason: it is a standing fact about the
 * article, not a control.
 *
 * No chip is a control either. Applying and removing tags is the card menu's
 * job, so a chip is a label — a card full of tiny buttons would put a tab stop
 * on every tag of every card in the grid. **The tag row itself is focusable**,
 * though: it scrolls sideways when a paper carries more tags than fit, and a
 * scroll container with nothing focusable inside it can be scrolled by pointer
 * but not by keyboard (WCAG 2.1.1).
 */
export function CardFooter({ status, tags }: CardFooterProps) {
  const StatusIcon = STATUS_ICONS[status]
  const statusLabel = `status: ${ARTICLE_STATUS_LABELS[status]}`

  return (
    <div className={styles.footer}>
      {/*
        Rendered only when there is something to list: an empty scroll container
        would still be a tab stop, on every untagged card in the collection.
      */}
      {tags.length > 0 && (
        // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll container with no focusable content must take focus itself to be keyboard-scrollable (WCAG 2.1.1)
        <ul className={styles.tagList} tabIndex={0} aria-label="tags">
          {tags.map((tag) => (
            <li key={tag.id} className={styles.chip}>
              {tag.name}
            </li>
          ))}
        </ul>
      )}

      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            // A `span`, not a button: there is nothing to activate. `role="img"`
            // with a name is what makes the glyph mean something to a screen
            // reader without announcing itself as an available action.
            <span
              className={styles.status}
              role="img"
              aria-label={statusLabel}
            />
          }
        >
          <StatusIcon className={styles.statusIcon} aria-hidden="true" />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={6}>
            <Tooltip.Popup className={styles.tooltip}>
              {statusLabel}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </div>
  )
}

/**
 * One icon per status, chosen to read as a progression: an empty ring for
 * untouched, an open book for in progress, a finished bookmark for done.
 */
const STATUS_ICONS: Record<ArticleStatus, typeof Circle> = {
  pending: Circle,
  reading: BookOpen,
  read: BookmarkCheck,
}
