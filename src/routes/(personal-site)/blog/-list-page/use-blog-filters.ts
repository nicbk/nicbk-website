import { getRouteApi } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { type BlogSearch } from './search-schema'

/**
 * The `/blog` route API, resolved by id rather than by importing the route
 * object, so this hook (imported by the list page, which the route imports) does
 * not create an import cycle with the route module.
 */
const routeApi = getRouteApi('/(personal-site)/blog/')

/**
 * How long typing must settle before the query is mirrored to the URL. This
 * debounce is purely to avoid churning the address bar on every keystroke — it
 * does NOT gate the visible list, which filters from `query` (local state)
 * instantly. See `useBlogFilters`.
 */
const QUERY_MIRROR_DEBOUNCE_MS = 250

/** The current filter state plus the callbacks that mutate it. */
export interface BlogFilterControls {
  /** Live search text — local state, updated on every keystroke. */
  query: string
  /** Currently selected tags (from the URL). */
  tags: string[]
  /** Replace the search text (takes effect immediately; URL mirror debounced). */
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
 * Read and update the blog's filter state.
 *
 * The URL search params remain the shareable source of truth (a filtered view
 * is linkable, bookmarkable, and survives refresh/back-forward — see
 * `search-schema.ts` and
 * research/coding-conventions/state-management-conventions.md). But the search
 * text also lives in local state (`query`) so the list can filter it *instantly*
 * as the reader types, rather than only after a navigation resolves:
 *
 * - `query` is local state; `setQuery` updates it immediately, so the visible
 *   list (which filters by `query`) reacts on every keystroke with no debounce.
 * - That local value is mirrored to the URL on a short debounce (`replace`, so
 *   keystrokes don't stack history), keeping the address bar shareable without
 *   putting a navigation on the typing hot path.
 * - External URL changes (a shared link, the back button, a reset) are adopted
 *   back into `query` by the sync effect; the mirror is skipped whenever the two
 *   already agree, so the two effects can't ping-pong.
 *
 * Tags stay purely URL-driven: a tag toggle is a single discrete action (not
 * continuous input), so navigating on click — and pushing a history entry, so
 * back/forward steps through tag changes — is both correct and instant.
 */
export function useBlogFilters(): BlogFilterControls {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  // Normalize the absent (undefined) filters to concrete empties, so consumers
  // and the filtering predicate never handle `undefined`.
  const urlQuery = search.q ?? ''
  const tags = search.tags ?? []

  const [query, setQuery] = useState(urlQuery)

  // Adopt external query changes (shared link, back/forward, reset) — ones that
  // did not originate from typing here — so local state mirrors the URL.
  useEffect(() => {
    setQuery(urlQuery)
  }, [urlQuery])

  // Mirror the settled local query to the URL. Skipped when it already equals
  // the URL (e.g. right after adopting an external change), so syncing never
  // triggers a redundant navigation and the two effects can't ping-pong.
  useEffect(() => {
    if (query === urlQuery) {
      return
    }
    const timer = setTimeout(() => {
      navigate({
        search: (prev) => cleanSearch({ q: query, tags: prev.tags ?? [] }),
        replace: true,
      })
    }, QUERY_MIRROR_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, urlQuery, navigate])

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

  return { query, tags, setQuery, toggleTag }
}
