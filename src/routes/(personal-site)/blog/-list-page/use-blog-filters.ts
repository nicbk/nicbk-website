import { getRouteApi } from '@tanstack/react-router'
import { useCallback } from 'react'
import { type BlogSearch } from './search-schema'

/**
 * The `/blog` route API, resolved by id rather than by importing the route
 * object, so this hook (imported by the list page, which the route imports) does
 * not create an import cycle with the route module.
 */
const routeApi = getRouteApi('/(personal-site)/blog/')

/** The current filter state plus the callbacks that mutate it via the URL. */
export interface BlogFilterControls {
  /** Current search text (from the URL). */
  q: string
  /** Currently selected tags (from the URL). */
  tags: string[]
  /** Replace the search text. */
  setQuery: (query: string) => void
  /** Add the tag if absent, remove it if present. */
  toggleTag: (tag: string) => void
}

/**
 * Drop filters at their empty value so an inactive filter leaves no trace in the
 * URL — a plain `/blog` stays `/blog`, not `/blog?q=&tags=%5B%5D`. The omitted
 * keys read back as `undefined` (normalized to empty below), so state is
 * unchanged.
 */
function cleanSearch(next: { q: string; tags: string[] }): BlogSearch {
  const cleaned: BlogSearch = {}
  if (next.q.trim() !== '') {
    cleaned.q = next.q
  }
  if (next.tags.length > 0) {
    cleaned.tags = next.tags
  }
  return cleaned
}

/**
 * Read and update the blog's filter state, which lives entirely in the route's
 * URL search params (see `search-schema.ts`) — so a filtered view is linkable,
 * bookmarkable, and survives refresh and back/forward.
 *
 * History strategy differs by control:
 * - `setQuery` uses `replace`, so live typing collapses into the current history
 *   entry instead of pushing one entry per keystroke (the debounce in
 *   `search-bar` further coalesces rapid input).
 * - `toggleTag` pushes a new entry, so back/forward steps through tag changes.
 */
export function useBlogFilters(): BlogFilterControls {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  // Normalize the absent (undefined) filters to concrete empties, so consumers
  // and the filtering predicate never handle `undefined`.
  const q = search.q ?? ''
  const tags = search.tags ?? []

  const setQuery = useCallback(
    (query: string) => {
      navigate({
        search: (prev) => cleanSearch({ q: query, tags: prev.tags ?? [] }),
        replace: true,
      })
    },
    [navigate],
  )

  const toggleTag = useCallback(
    (tag: string) => {
      navigate({
        search: (prev) => {
          const current = prev.tags ?? []
          const nextTags = current.includes(tag)
            ? current.filter((existing) => existing !== tag)
            : [...current, tag]
          return cleanSearch({ q: prev.q ?? '', tags: nextTags })
        },
      })
    },
    [navigate],
  )

  return { q, tags, setQuery, toggleTag }
}
