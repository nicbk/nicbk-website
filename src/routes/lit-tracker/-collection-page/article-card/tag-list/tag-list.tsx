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
 * Nothing here is interactive. Applying and removing tags is the card menu's
 * job, so a chip is a label rather than a control — a card full of tiny buttons
 * would also put a tab stop on every tag of every card in the grid.
 */
export function TagList({ status, tags }: TagListProps) {
  const StatusIcon = STATUS_ICONS[status]

  return (
    <ul className={styles.list}>
      <li className={styles.statusChip}>
        <StatusIcon className={styles.statusIcon} aria-hidden="true" />
        {/* Named for assistive technology, because "reading" on its own does
            not say that it is this article's reading status rather than a tag
            the reader happened to create with that name. */}
        <span className={styles.srOnly}>reading status: </span>
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
