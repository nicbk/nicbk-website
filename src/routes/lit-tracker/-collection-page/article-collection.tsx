import type { ArticleStatus } from '~/lit-tracker/article-status'
import { TrackerLoading } from '../-components/tracker-loading/tracker-loading'
import type { CollectionArticle } from './article-card/article-card'
import { ArticleCard } from './article-card/article-card'
import type { CollectionTag } from './article-card/article-menu/article-menu'
import { NO_TAGS } from './article-tags'
import styles from './collection-page.module.css'

/**
 * Defined next to the card that consumes it — it describes the fields *a card
 * shows* — and re-exported here because this component is what callers hand
 * rows to.
 */
export type { CollectionArticle } from './article-card/article-card'

/**
 * Whether the collection is known yet.
 *
 * Zero reports this per query, and the distinction is load-bearing: an account
 * whose data has not arrived yet and an account with nothing in it are the same
 * empty array, and telling the reader "no articles" while the sync is still in
 * flight would be a lie that looks exactly like data loss.
 */
export type CollectionState = 'syncing' | 'ready' | 'error'

interface ArticleCollectionProps {
  articles: readonly CollectionArticle[]
  state: CollectionState
  /** Every tag the reader has, for each card's menu. */
  allTags: readonly CollectionTag[]
  /** Which tags each article carries, keyed by article id. */
  tagsByArticle: ReadonlyMap<string, readonly CollectionTag[]>
  /**
   * The three writes a card can make. Taken as callbacks rather than as a
   * mutations object so this component — and every card under it — stays
   * assertable with plain spies and no Zero client.
   */
  onSetStatus: (articleId: string, status: ArticleStatus) => void
  onToggleTag: (articleId: string, tagId: string, applied: boolean) => void
  onCreateTag: (articleId: string, name: string) => void
}

/** Shown once the collection is known to be empty. */
export const EMPTY_COLLECTION_MESSAGE = 'no articles yet.'

/** Shown when the query itself failed, rather than returning nothing. */
export const COLLECTION_ERROR_MESSAGE =
  'your collection could not be loaded. it will reappear once the connection recovers.'

/**
 * The article collection, as a grid of cards.
 *
 * Presentational on purpose: it takes rows and a state rather than running the
 * query itself, so it can be rendered — and asserted — without a Zero client.
 * `CollectionPage` next door is the half that talks to Zero.
 *
 * This component predates the card: #7 shipped it as a plain list of titles and
 * authors, and #8's first task replaced only how a row is drawn. The
 * syncing/ready/error split, the empty-state wording, and the author formatting
 * are unchanged, which is what "upgraded, not replaced" meant in practice.
 * Still to come here: tags on the card and its three-dot menu (task 2), and the
 * filtering that decides which rows arrive at all (tasks 3 and 4).
 */
export function ArticleCollection({
  articles,
  state,
  allTags,
  tagsByArticle,
  onSetStatus,
  onToggleTag,
  onCreateTag,
}: ArticleCollectionProps) {
  if (state === 'error') {
    // The decided pattern for an error outside a form context is a dismissible
    // toast (research/ui-ux/design-system.md), and no toast component exists on
    // this site yet. Building one to carry a single message would be a
    // site-wide component decided by a lit-tracker detail, so the message is
    // inline here and announced; #8 is where a toast, if one is built, would
    // take it over.
    return (
      <p className={styles.notice} role="alert">
        {COLLECTION_ERROR_MESSAGE}
      </p>
    )
  }

  if (state === 'syncing') {
    // The same placeholder shown before hydration, so the two moments a reader
    // cannot tell apart do not look different either.
    return <TrackerLoading />
  }

  if (articles.length === 0) {
    return <p className={styles.notice}>{EMPTY_COLLECTION_MESSAGE}</p>
  }

  return (
    <ul className={styles.grid} aria-label="Articles">
      {articles.map((article) => (
        // The containment lives on the grid cell rather than on the card, so the
        // card measures the space it was *given* rather than the space it
        // happens to occupy — a container cannot query itself.
        <li key={article.id} className={styles.cell}>
          <ArticleCard
            article={article}
            tags={tagsByArticle.get(article.id) ?? NO_TAGS}
            allTags={allTags}
            onSetStatus={(status) => onSetStatus(article.id, status)}
            onToggleTag={(tagId, applied) =>
              onToggleTag(article.id, tagId, applied)
            }
            onCreateTag={(name) => onCreateTag(article.id, name)}
          />
        </li>
      ))}
    </ul>
  )
}
