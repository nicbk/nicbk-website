import type { Author } from '~/db/schema/lit-tracker'
import { TrackerLoading } from '../-components/tracker-loading/tracker-loading'
import { formatAuthors } from './authors'
import styles from './collection-page.module.css'

/** The article fields this surface shows — deliberately not the whole row. */
export interface CollectionArticle {
  id: string
  title: string
  authors: readonly Author[]
}

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
}

/** Shown once the collection is known to be empty. */
export const EMPTY_COLLECTION_MESSAGE = 'no articles yet.'

/** Shown when the query itself failed, rather than returning nothing. */
export const COLLECTION_ERROR_MESSAGE =
  'your collection could not be loaded. it will reappear once the connection recovers.'

/**
 * The article collection, as a plain list of titles and authors.
 *
 * Presentational on purpose: it takes rows and a state rather than running the
 * query itself, so it can be rendered — and asserted — without a Zero client.
 * `CollectionPage` next door is the half that talks to Zero.
 *
 * Deliberately minimal, and deliberately not throwaway. #8 replaces this list
 * with the card grid and builds the tag sidebar and live search around it; the
 * author formatting, the empty-state wording, and the syncing/ready/error split
 * all survive that. What #8 changes is how a row is drawn, not what a row is.
 */
export function ArticleCollection({ articles, state }: ArticleCollectionProps) {
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
    <ul className={styles.list} aria-label="Articles">
      {articles.map((article) => (
        <li key={article.id} className={styles.entry}>
          <span className={styles.entryTitle}>{article.title}</span>
          <span className={styles.authors}>
            {formatAuthors(article.authors)}
          </span>
        </li>
      ))}
    </ul>
  )
}
