import { PanelLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Author } from '~/db/schema/lit-tracker'
import type { ArticleStatus } from '~/lit-tracker/article-status'
import type { CollectionTag } from '~/routes/lit-tracker/-components/article-menu/article-menu'
import { ArticleMenu } from '~/routes/lit-tracker/-components/article-menu/article-menu'
import { NarrowScreenDrawer } from '~/routes/lit-tracker/-components/narrow-screen-drawer/narrow-screen-drawer'
import { formatAuthors } from '../-collection-page/authors'
import styles from './article-summary.module.css'

/**
 * The article fields this page's header shows.
 *
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

interface ArticleSummaryProps {
  article: DetailArticle
  /** Every tag the reader has, for the menu's checklist. */
  allTags: readonly CollectionTag[]
  /** Which of them this article carries. */
  appliedTagIds: ReadonlySet<string>
  onSetStatus: (status: ArticleStatus) => void
  onToggleTag: (tagId: string, applied: boolean) => void
  onCreateTag: (name: string) => void
  /**
   * The sidebar, for the narrow-screen sheet this row's trigger opens. An
   * element rather than a rendered tree, so it is only mounted while the sheet
   * is open — the rail is showing the same thing above the breakpoint.
   */
  sidebar: ReactNode
}

/** Names the sheet and its trigger, and the rail on wide screens. */
export const SIDEBAR_LABEL = 'article'

/**
 * The top of the article page: what the paper is, and the two controls that act
 * on the page as a whole.
 *
 * The decided layout puts the metadata summary below the tracker header with a
 * three-dot menu on it
 * (research/ui-ux/pages/lit-tracker/pages/article-detail.md). **The menu is the
 * card's menu**, unchanged — the same component, the same tag and status
 * controls, and the same one that #11 will add "edit…" and "delete…" to. A
 * second, differently-populated menu one click away from the first is exactly
 * the drift the reuse rule exists to prevent.
 *
 * The sidebar trigger sits here rather than above the reader (user-decided
 * 2026-08-09): this row is already the page's header, it never scrolls away, and
 * putting the trigger in the reader's own toolbar would mix a page-level control
 * into a strip that is otherwise entirely about the document. It shows only
 * below the breakpoint — `NarrowScreenDrawer` hides it in CSS, at the same width
 * the rail hides itself.
 *
 * Presentational: it takes a row and callbacks and knows nothing about Zero.
 */
export function ArticleSummary({
  article,
  allTags,
  appliedTagIds,
  onSetStatus,
  onToggleTag,
  onCreateTag,
  sidebar,
}: ArticleSummaryProps) {
  const { title, authors, publicationYear, venue } = article
  // See `DetailArticle`: the null is Zero's, not Postgres's.
  const status = article.status ?? 'pending'
  const authorLine = formatAuthors(authors)
  const meta = formatPublication(publicationYear, venue)

  return (
    <header className={styles.summary}>
      <div className={styles.text}>
        {/*
          The page's <h1> and the route-change focus-handoff target
          (src/focus-handoff.ts). Unlike the collection's, this one is drawn: the
          title *is* what the page is about, so there is nothing to duplicate by
          showing it.

          Not elided. The card clamps a title because every card in a grid must
          be the same height; here there is one, and a paper with a long title
          deserves to have it read rather than truncated with a tooltip.
        */}
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.authors}>{authorLine}</p>
        {meta !== null && <p className={styles.meta}>{meta}</p>}
      </div>

      <div className={styles.controls}>
        <NarrowScreenDrawer label={SIDEBAR_LABEL} icon={PanelLeft}>
          {sidebar}
        </NarrowScreenDrawer>

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
    </header>
  )
}

/**
 * Year and venue as one line, with whichever of them exists.
 *
 * The same rule the card follows, deliberately duplicated as a two-line function
 * rather than shared: the card elides this line and this page does not, and a
 * shared helper would be one import binding two surfaces that are about to
 * diverge for good reasons. If a third surface wants it, that is the point to
 * extract it.
 */
function formatPublication(
  publicationYear: number | null,
  venue: string | null,
): string | null {
  const parts = [publicationYear, venue].filter(
    (part): part is number | string => part !== null && part !== '',
  )
  return parts.length === 0 ? null : parts.join(', ')
}
