import { getRouteApi } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import type { ArticleStatus } from '~/lit-tracker/article-status'
import type { CollectionSearch } from './search-schema'

/**
 * The `/lit-tracker` layout route's API, resolved by id rather than by importing
 * the route object, so this hook — used by components the route itself renders —
 * does not create an import cycle with the route module.
 */
const routeApi = getRouteApi('/lit-tracker')

/** The active filters, plus the callbacks that change them. */
export interface CollectionFilterControls {
  /** Selected tag names. An article must carry every one of them. */
  tags: readonly string[]
  /** The selected reading status, or `undefined` for "any". */
  status: ArticleStatus | undefined
  /** Whether anything is filtering at all — what tells the two empty states apart. */
  active: boolean
  /** Add the tag if absent, remove it if present. */
  toggleTag: (name: string) => void
  /**
   * Remove a tag from the selection, whether or not it was in it.
   *
   * Not the same as toggling: this is what runs when a tag is *deleted*, and a
   * toggle would put a tag that no longer exists back into the URL.
   */
  dropTag: (name: string) => void
  /**
   * Select a status, or clear it by choosing the one already selected.
   *
   * Unlike an article's own status — which is a column and always has a value —
   * "any status" is a legitimate thing to filter for, so this group can be
   * emptied where the card's cannot.
   */
  toggleStatus: (status: ArticleStatus) => void
  /**
   * Drop every filter at once — including the search text, which is the same
   * search object even though a different hook writes it. "Clear" that left
   * something narrowing the collection would not be one.
   */
  clear: () => void
}

/**
 * Drop filters at their empty value so an inactive filter leaves no trace in the
 * URL — a plain `/lit-tracker` stays `/lit-tracker`, not
 * `/lit-tracker?tags=%5B%5D`. The omitted keys read back as `undefined`
 * (normalized to empty by the hook), so state is unchanged.
 *
 * **The search text is carried through, not rebuilt.** It belongs to the same
 * search object but to a different hook (`use-collection-search.ts`), and this
 * function replaces the whole object — so a `q` this hook did not think about
 * would be erased by the next tag toggle, silently un-searching the collection
 * mid-interaction.
 */
function cleanSearch(next: {
  q: string | undefined
  tags: readonly string[]
  status: ArticleStatus | undefined
}): CollectionSearch {
  const cleaned: CollectionSearch = {}
  if (next.q !== undefined && next.q.trim() !== '') {
    cleaned.q = next.q
  }
  if (next.tags.length > 0) {
    cleaned.tags = [...next.tags]
  }
  if (next.status !== undefined) {
    cleaned.status = next.status
  }
  return cleaned
}

/**
 * Read and update the collection's filter state.
 *
 * The URL is the source of truth throughout, with no local mirror. The blog's
 * equivalent keeps one for its *search text*, because typing is continuous and
 * must not wait on a navigation; every filter here is a discrete toggle, and the
 * decided convention says so explicitly — navigating on click is already
 * instant, and pushing a history entry is what makes the back button step back
 * through the selections.
 *
 * Callers get this by calling the hook rather than by having state threaded to
 * them: it is read in two places at once (the rail beside the collection and the
 * drawer that replaces it on narrow screens), and both must agree. Going through
 * the router means they cannot disagree — there is one URL.
 */
export function useCollectionFilters(): CollectionFilterControls {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  // Normalize the absent (undefined) filters, so consumers and the filtering
  // predicate never handle two representations of "nothing selected". The empty
  // case is one shared constant rather than a fresh `[]`: the collection memoizes
  // its filtered rows on these values, and a new array every render would mean
  // re-filtering the whole collection on every render.
  const tags = search.tags ?? NO_TAGS
  const status = search.status

  const toggleTag = useCallback(
    (name: string) => {
      navigate({
        search: (prev) => {
          const current = prev.tags ?? []
          const nextTags = current.includes(name)
            ? current.filter((existing) => existing !== name)
            : [...current, name]
          return cleanSearch({
            q: prev.q,
            tags: nextTags,
            status: prev.status,
          })
        },
      })
    },
    [navigate],
  )

  const dropTag = useCallback(
    (name: string) => {
      navigate({
        search: (prev) =>
          cleanSearch({
            q: prev.q,
            tags: (prev.tags ?? []).filter((existing) => existing !== name),
            status: prev.status,
          }),
        // Replaces rather than pushes: deleting a tag is not a filter change the
        // reader would want to step back through, and the state before it — a
        // filter on a tag that no longer exists — is not one to return to.
        replace: true,
      })
    },
    [navigate],
  )

  const toggleStatus = useCallback(
    (next: ArticleStatus) => {
      navigate({
        search: (prev) =>
          cleanSearch({
            q: prev.q,
            tags: prev.tags ?? [],
            status: prev.status === next ? undefined : next,
          }),
      })
    },
    [navigate],
  )

  const clear = useCallback(() => {
    navigate({ search: () => ({}) })
  }, [navigate])

  // Memoized for the same reason the empty array is a constant: consumers use
  // this object as a dependency, and a fresh one per render would invalidate
  // everything downstream of it every time anything on the page re-rendered.
  return useMemo(
    () => ({
      tags,
      status,
      active: tags.length > 0 || status !== undefined,
      toggleTag,
      dropTag,
      toggleStatus,
      clear,
    }),
    [tags, status, toggleTag, dropTag, toggleStatus, clear],
  )
}

/** The stable "no tags selected" value; see `useCollectionFilters`. */
const NO_TAGS: readonly string[] = []
