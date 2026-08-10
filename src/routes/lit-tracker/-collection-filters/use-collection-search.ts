import { getRouteApi } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { CollectionSearch } from './search-schema'

/**
 * The `/lit-tracker` layout route's API, resolved by id for the same reason
 * `use-collection-filters.ts` does: no import cycle with the route module.
 */
const routeApi = getRouteApi('/lit-tracker')

/**
 * How long typing must settle before the query is mirrored to the URL.
 *
 * Purely to keep the address bar from churning once per character — it does NOT
 * gate the visible grid, which filters from `query` (local state) instantly.
 * The same value the blog uses, because it is the same interaction.
 */
const QUERY_MIRROR_DEBOUNCE_MS = 250

/** The live search text and the setter that changes it. */
export interface CollectionSearchControls {
  /** Live search text — local state, updated on every keystroke. */
  query: string
  /** Replace the search text (takes effect immediately; URL mirror debounced). */
  setQuery: (query: string) => void
}

/**
 * Read and update the collection's search text.
 *
 * ## Why this is not part of `useCollectionFilters`
 *
 * They write the same search object and look like halves of one hook, but they
 * cannot be one, because they are read in different numbers of places. The
 * filters are read twice at once — the rail beside the collection and the drawer
 * that replaces it on a narrow screen — and going through the URL is exactly
 * what stops those two disagreeing.
 *
 * This hook keeps **local state**, for the reason the blog's equivalent records:
 * typing is continuous, and a grid that waits for a navigation to resolve
 * before it narrows is a grid that stutters under the reader's hands. Local
 * state in a hook called from two places would be two states — the toolbar's
 * input updating its own copy while the grid read the debounced URL — so this
 * one is deliberately called **once**, by `CollectionPage`, which passes the
 * value down to the input and uses it to filter. That is also why it holds no
 * filter state: whoever calls it must be the single owner of the text, and the
 * rail must not have to become one.
 *
 * The URL stays the shareable source of truth either way:
 *
 * - `setQuery` updates local state immediately, so the grid reacts per keystroke.
 * - That value is mirrored to the URL on a short debounce (`replace`, so
 *   keystrokes do not stack history entries).
 * - External URL changes — a shared link, the back button, the rail's "clear" —
 *   are adopted back into `query`, and the mirror is skipped whenever the two
 *   already agree, so the two effects cannot ping-pong.
 */
export function useCollectionSearch(): CollectionSearchControls {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  // Normalize the absent (undefined) query, so consumers and the filtering
  // predicate never handle two representations of "nothing typed".
  const urlQuery = search.q ?? ''

  const [query, setQuery] = useState(urlQuery)

  // Adopt external query changes — ones that did not originate from typing here.
  useEffect(() => {
    setQuery(urlQuery)
  }, [urlQuery])

  // Mirror the settled local query to the URL. Skipped when it already equals
  // the URL (e.g. right after adopting an external change).
  useEffect(() => {
    if (query === urlQuery) {
      return
    }
    const timer = setTimeout(() => {
      navigate({
        search: (prev): CollectionSearch => {
          // The other filters are carried through untouched: this hook owns one
          // key of a shared object, and rebuilding the object from what it knows
          // about would clear the tags the rail had selected.
          const next: CollectionSearch = { ...prev }
          if (query.trim() === '') {
            delete next.q
          } else {
            next.q = query
          }
          return next
        },
        replace: true,
      })
    }, QUERY_MIRROR_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, urlQuery, navigate])

  return { query, setQuery }
}
