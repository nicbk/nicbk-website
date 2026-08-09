import { BookmarkCheck, BookOpen, Circle } from 'lucide-react'
import type { ArticleStatus } from '~/lit-tracker/article-status'
import { ARTICLE_STATUS_LABELS } from '~/lit-tracker/article-status'
import type { CollectionTag } from '../article-menu/article-menu'
import styles from './tag-list.module.css'

interface TagListProps {
  status: ArticleStatus
  /** The user tags this article carries, already in the order to show them. */
  tags: readonly CollectionTag[]
}

/**
 * The chips along the foot of a card: reading status, then the reader's own
 * tags.
 *
 * Status renders **as a tag**, which is the decided model
 * (research/ui-ux/pages/lit-tracker/pages/collection-view.md) and is why the
 * filter rail will be able to offer both in one list. Underneath it is nothing
 * like a tag — it is `articles.status`, a single column, which is what makes the
 * three mutually exclusive for free
 * (research/data-modeling/tags-and-reading-status.md). The similarity is
 * deliberate at the surface and deliberately absent below it.
 *
 * **The status chip is still distinguishable**, and not by color: it carries an
 * icon that differs per status, so it reads as the status chip in grayscale and
 * says which status it is without the reader having learned a palette
 * (WCAG 1.4.1). Every status always shows — an article nobody has opened is
 * `pending`, and hiding that would make the commonest state the invisible one.
 *
 * No chip is a control. Applying and removing tags is the card menu's job, so a
 * chip is a label — a card full of tiny buttons would put a tab stop on every
 * tag of every card in the grid.
 *
 * **The row itself is focusable, though**, and that is not a contradiction. It
 * scrolls sideways when a paper carries more tags than fit (see the stylesheet
 * for why it scrolls rather than wraps), and a scroll container with nothing
 * focusable inside it can be scrolled by pointer but not by keyboard. One tab
 * stop per card buys the tags past the right-hand edge; the alternative leaves
 * them unreachable, which is WCAG 2.1.1.
 */
export function TagList({ status, tags }: TagListProps) {
  const StatusIcon = STATUS_ICONS[status]

  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: a scroll container with no focusable content needs to take focus itself to be keyboard-scrollable
    <ul className={styles.list} tabIndex={0} aria-label="status and tags">
      <li className={styles.statusChip}>
        <StatusIcon className={styles.statusIcon} aria-hidden="true" />
        {/*
          Named for assistive technology, because "reading" on its own does not
          say that it is this article's reading status rather than a tag the
          reader happened to create with that name.

          "status:" rather than "reading status:" deliberately: the longer form
          makes *every* status chip contain the word "reading", including the one
          reading `read` — which reads oddly aloud and made a test asserting "no
          chip says reading" pass against a chip that said `read`.
        */}
        <span className={styles.srOnly}>status: </span>
        {ARTICLE_STATUS_LABELS[status]}
      </li>

      {tags.map((tag) => (
        <li key={tag.id} className={styles.chip}>
          {tag.name}
        </li>
      ))}
    </ul>
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
