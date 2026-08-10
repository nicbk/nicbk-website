import type { QueryResultDetails } from '@rocicorp/zero'
import { useQuery } from '@rocicorp/zero/react'
import { useMemo } from 'react'
import { queries } from '~/zero/queries'
import { useCollectionFilters } from '../-collection-filters/use-collection-filters'
import { CollectionToolbar } from '../-components/collection-toolbar/collection-toolbar'
import type { CollectionState } from './article-collection'
import { ArticleCollection } from './article-collection'
import { tagsByArticle } from './article-tags'
import { filterArticles } from './filter-articles'
import { useCollectionMutations } from './use-collection-mutations'
import styles from './collection-page.module.css'

/**
 * The Lit Tracker's home surface, and the first place on this site where data
 * arrives by sync rather than by request.
 *
 * Nothing about *which* rows come back is decided here. Calling a query returns
 * a request naming it, which zero-cache resolves by asking `/api/zero/query` for
 * the ZQL — so this component names what it wants and the server decides what
 * that means for this session. A row inserted into Postgres by anything at all,
 * including a background job or another of this reader's open windows, reaches
 * this list the same way
 * (research/system-architecture/reactivity-propagation.md).
 *
 * Queries are built inline on every render rather than memoized: Zero keys its
 * materialized views by query hash, so the identical request resolves to the
 * identical view.
 *
 * **This is also where writes start.** `useCollectionMutations` is called once
 * here and its results are bound per card, so every component below this one
 * takes callbacks and knows nothing about Zero — which is what keeps the card,
 * the menu, and the chips assertable without a client.
 *
 * The surface is filling in one task at a time: #7 gave it the toolbar and a
 * plain list, #8's first task made that a card grid, and its second added tags,
 * reading status, and the card menu. Still absent — the filter rail and search —
 * are #8's last two, each of which changes what this page renders without
 * changing how it asks for it.
 */
export function CollectionPage() {
  const [articles, details] = useQuery(queries.articles.mine())
  // Two more synced lists, each authorized by its own `/query` entry rather
  // than reached through the articles query's relationships. The tag list is
  // wanted whole — a card's menu offers every tag the reader has, not only the
  // ones already on that card — so it is a query in its own right, and the join
  // rows come alongside it.
  const [tags] = useQuery(queries.tags.mine())
  const [appliedTags] = useQuery(queries.articleTags.mine())

  const mutations = useCollectionMutations()
  // The same filter state the rail writes. Read from the URL rather than passed
  // in, because the rail that sets it renders in the shell's sidebar and there
  // is no prop path from there to here (see `use-collection-filters.ts`).
  const filters = useCollectionFilters()

  // Rebuilt when either list changes rather than on every render: this walks
  // the whole join table, and the grid re-renders for reasons that have nothing
  // to do with tags.
  const tagsForArticle = useMemo(
    () => tagsByArticle(appliedTags, tags),
    [appliedTags, tags],
  )

  // Filtering happens here, over rows already synced, rather than by asking
  // zero-cache for a narrower query. That is the decided model — search and
  // filters run against the local cache so they are instant
  // (research/ui-ux/pages/lit-tracker/pages/collection-view.md) — and it is also
  // what lets a filter change be a plain re-render with no round trip.
  const visible = useMemo(
    () => filterArticles(articles, tagsForArticle, filters),
    [articles, tagsForArticle, filters],
  )

  return (
    <div className={styles.page}>
      {/*
        The page's <h1> and the route-change focus-handoff target
        (src/focus-handoff.ts), deliberately not drawn.

        The decided layout has no page title: the main panel opens with the
        search row, and the header already says "Literature Tracker". A visible
        "collection" heading was an addition, and it pushed the toolbar and the
        articles into three separately-aligned bands. Clipped rather than
        removed, because the landmark structure and the focus handoff both need
        a heading to exist.
      */}
      <h1 className={styles.title}>collection</h1>

      {/* Above the collection and outside its loading states: uploading does
          not depend on the article query having landed, and hiding the "+"
          while the first sync is in flight would make the page look broken. */}
      <CollectionToolbar />

      <ArticleCollection
        articles={visible}
        state={collectionState(details)}
        // What tells "nothing matches these filters" apart from "this account
        // has no articles". The collection cannot work it out from an empty
        // array — both cases are one.
        filtered={filters.active}
        allTags={tags}
        tagsByArticle={tagsForArticle}
        // The card knows which article it is; the mutations take that as an
        // argument. Binding here rather than handing the whole mutations object
        // down keeps every component below this one free of Zero.
        onSetStatus={mutations.setStatus}
        onToggleTag={(articleId, tagId, applied) =>
          applied
            ? mutations.applyTag(articleId, tagId)
            : mutations.removeTag(articleId, tagId)
        }
        onCreateTag={mutations.createAndApplyTag}
      />
    </div>
  )
}

/**
 * Zero's per-query result type, as the three states this page draws.
 *
 * `'unknown'` means the query has not finished its first round trip — the rows
 * in hand may be a partial local view, or nothing at all. Treating it as
 * `'ready'` would render "no articles yet." at an account that has plenty.
 */
function collectionState(details: QueryResultDetails): CollectionState {
  switch (details.type) {
    case 'complete':
      return 'ready'
    case 'error':
      return 'error'
    case 'unknown':
      return 'syncing'
  }
}
